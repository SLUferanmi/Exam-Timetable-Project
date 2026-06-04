"""
comparison_algos.py
───────────────────
In-memory, non-persisting implementations for benchmarking:

  • BasicGreedyScheduler          — Pure First-Fit Decreasing (FFD).
  • TraditionalTimetableScheduler — Strict historical replay with 3-tier
                                    fallback so courses with historical data
                                    are essentially never dropped.

The Improved algorithm is NOT re-run here; views.py reads existing
ExamSchedule DB records directly (100 % identical to Generate Timetable output).
"""

import time
from collections import defaultdict
from typing import List, Dict, Any


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _slot_label(start_time) -> str:
    """Convert a start_time (time object or 'HH:MM:SS' string) to morning/midday/afternoon."""
    try:
        hour = start_time.hour  # datetime.time object
    except AttributeError:
        hour = int(str(start_time).split(':')[0])
    if hour < 11:
        return 'morning'
    if hour < 14:
        return 'midday'
    return 'afternoon'


def _effective_cap(hall: Dict) -> int:
    """Return the usable exam capacity for a hall dict."""
    return hall.get('exam_capacity_single') or hall.get('capacity') or 0


def _make_entry(course, hall_name, ts, students, is_split=False, guided=False):
    return {
        "course_code":       course['code'],
        "course_title":      course.get('title', ''),
        "department":        course.get('department', ''),
        "students":          students,
        "hall_name":         hall_name,
        "slot_id":           ts['id'],
        "slot_date":         str(ts['date']),
        "slot_start":        str(ts['start_time'])[:5],
        "slot_end":          str(ts['end_time'])[:5],
        "violations":        [],
        "is_forced":         False,
        "is_split":          is_split,
        "preference_guided": guided,
        "constraints_total": 0,
        "constraints_met":   0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Basic Greedy — First-Fit Decreasing
# ─────────────────────────────────────────────────────────────────────────────

class BasicGreedyScheduler:
    """
    Pure FFD scheduler.

    Ordering:
      • Courses  – largest required_capacity first
      • Timeslots – strict chronological (Mon 08:15 first, etc.)
      • Halls     – largest capacity first

    No constraint checking, no splitting, no preferences.
    A course that doesn't fit anywhere is dropped.
    """

    def __init__(self, courses: List[Dict], halls: List[Dict], timeslots: List[Dict]):
        self.courses   = sorted(courses,   key=lambda c: c.get('required_capacity', 0), reverse=True)
        self.halls     = sorted(halls,     key=lambda h: _effective_cap(h),             reverse=True)
        self.timeslots = timeslots  # already sorted by date, start_time from views.py

        # remaining capacity per (ts_id, hall_name)
        self.avail: Dict[tuple, int] = {}
        for ts in self.timeslots:
            for h in self.halls:
                self.avail[(ts['id'], h['name'])] = _effective_cap(h)

    def schedule(self):
        t0         = time.time()
        schedule   = []
        dropped    = []

        for course in self.courses:
            need  = course.get('required_capacity', 0)
            placed = False

            for ts in self.timeslots:
                for hall in self.halls:
                    key = (ts['id'], hall['name'])
                    if self.avail[key] >= need:
                        self.avail[key] -= need
                        schedule.append(_make_entry(course, hall['name'], ts, need))
                        placed = True
                        break
                if placed:
                    break

            if not placed:
                dropped.append(course['code'])

        elapsed_ms = (time.time() - t0) * 1000
        total_seats = sum(_effective_cap(h) for h in self.halls) * len(self.timeslots)
        used_seats  = sum(e['students'] for e in schedule)
        util        = round(used_seats / total_seats * 100, 1) if total_seats else 0.0

        return {
            "schedule": schedule,
            "metrics": {
                "time_ms":             elapsed_ms,
                "scheduled":           len(schedule),
                "dropped":             len(dropped),
                "forced":              0,
                "dept_conflicts":      0,
                "capacity_violations": 0,
                "utilization_pct":     util,
                "dropped_codes":       dropped,
                "historically_guided": 0,
            },
        }


# ─────────────────────────────────────────────────────────────────────────────
# Traditional — Historical Replay with 3-Tier Fallback
# ─────────────────────────────────────────────────────────────────────────────

class TraditionalTimetableScheduler:
    """
    Replicates the old manual timetabling process by honouring the exact
    (hall, time-of-day) patterns recorded in the historical PDF timetables.

    Placement priority per course:
      Tier 1 – Exact historical hall  + matching slot label  (morning/midday/afternoon)
      Tier 2 – Any active project hall + matching slot label
      Tier 3 – Any active project hall + any slot
             (last resort — ensures zero drops for courses with hist. data)

    Because all project courses were sourced from the uploaded PDFs, every
    course should have at least one HistoricalEntry.  With the 3-tier fallback
    the expected number of truly dropped courses is zero.
    """

    def __init__(
        self,
        courses:            List[Dict],
        halls:              List[Dict],
        timeslots:          List[Dict],
        historical_entries: List[Dict],   # values('course_code', 'hall_name', 'slot_label')
    ):
        self.courses   = courses
        self.timeslots = timeslots

        # halls indexed by name (lower-cased for fuzzy matching)
        self.halls_by_name: Dict[str, Dict] = {h['name']: h for h in halls}
        self.halls_lower:   Dict[str, str]  = {h['name'].lower(): h['name'] for h in halls}

        # Build history map: code -> list of {hall_name, slot_label}
        self.history: Dict[str, List[Dict]] = defaultdict(list)
        for e in historical_entries:
            self.history[e['course_code']].append({
                'hall_name':  e['hall_name'],
                'slot_label': e['slot_label'],
            })

        # Group timeslots by label for quick lookup
        self.slots_by_label: Dict[str, List[Dict]] = defaultdict(list)
        for ts in self.timeslots:
            self.slots_by_label[_slot_label(ts['start_time'])].append(ts)

        # Remaining capacity: (ts_id, hall_name) -> seats left
        self.avail: Dict[tuple, int] = {}
        for ts in self.timeslots:
            for h_name, h in self.halls_by_name.items():
                self.avail[(ts['id'], h_name)] = _effective_cap(h)

    # ── Helpers ────────────────────────────────────────────────────────────

    def _resolve_hall(self, hist_hall_name: str):
        """Map a historical hall name to an active project hall name.
        Returns None if this hall is not in the project's active halls.
        """
        # Exact match
        if hist_hall_name in self.halls_by_name:
            return hist_hall_name
        # Case-insensitive match
        lower = hist_hall_name.lower()
        if lower in self.halls_lower:
            return self.halls_lower[lower]
        # Substring match — e.g. "BLOCK A LECTURE THEATRE" vs "Block A LT"
        for proj_lower, proj_name in self.halls_lower.items():
            if proj_lower in lower or lower in proj_lower:
                return proj_name
        return None

    def _try_place(self, hall_name: str, ts: Dict, need: int) -> bool:
        key = (ts['id'], hall_name)
        return self.avail.get(key, 0) >= need

    def _consume(self, hall_name: str, ts: Dict, need: int):
        key = (ts['id'], hall_name)
        self.avail[key] -= need

    # ── Main scheduling logic ──────────────────────────────────────────────

    def schedule(self):
        t0        = time.time()
        schedule  = []
        dropped   = []
        guided    = 0
        placed_codes = set()

        for course in self.courses:
            code  = course['code']
            need  = course.get('required_capacity', 0)
            patterns = self.history.get(code, [])
            placed   = False

            # ── Tier 1: Exact historical hall + matching slot label ───────
            for pat in patterns:
                proj_hall = self._resolve_hall(pat['hall_name'])
                if proj_hall is None:
                    continue
                label = pat['slot_label']
                for ts in self.slots_by_label.get(label, []):
                    if self._try_place(proj_hall, ts, need):
                        self._consume(proj_hall, ts, need)
                        schedule.append(_make_entry(course, proj_hall, ts, need, guided=True))
                        guided  += 1
                        placed   = True
                        break
                if placed:
                    break

            # ── Tier 2: Any active hall + matching slot label ─────────────
            if not placed and patterns:
                preferred_label = patterns[0]['slot_label']  # most common
                for ts in self.slots_by_label.get(preferred_label, []):
                    for h_name in self.halls_by_name:
                        if self._try_place(h_name, ts, need):
                            self._consume(h_name, ts, need)
                            schedule.append(_make_entry(course, h_name, ts, need, guided=True))
                            guided  += 1
                            placed   = True
                            break
                    if placed:
                        break

            # ── Tier 3: Any active hall + any slot ────────────────────────
            if not placed and patterns:
                for ts in self.timeslots:
                    for h_name in self.halls_by_name:
                        if self._try_place(h_name, ts, need):
                            self._consume(h_name, ts, need)
                            schedule.append(_make_entry(course, h_name, ts, need, guided=True))
                            guided  += 1
                            placed   = True
                            break
                    if placed:
                        break

            # ── No history at all: plain first-fit ───────────────────────
            if not placed and not patterns:
                for ts in self.timeslots:
                    for h_name in self.halls_by_name:
                        if self._try_place(h_name, ts, need):
                            self._consume(h_name, ts, need)
                            schedule.append(_make_entry(course, h_name, ts, need, guided=False))
                            placed = True
                            break
                    if placed:
                        break

            if not placed:
                dropped.append(code)
            else:
                placed_codes.add(code)

        elapsed_ms  = (time.time() - t0) * 1000
        total_seats = sum(_effective_cap(h) for h in self.halls_by_name.values()) * len(self.timeslots)
        used_seats  = sum(e['students'] for e in schedule)
        util        = round(used_seats / total_seats * 100, 1) if total_seats else 0.0

        return {
            "schedule": schedule,
            "metrics": {
                "time_ms":             elapsed_ms,
                "scheduled":           len(placed_codes),
                "dropped":             len(dropped),
                "forced":              0,
                "dept_conflicts":      0,
                "capacity_violations": 0,
                "utilization_pct":     util,
                "dropped_codes":       dropped,
                "historically_guided": guided,
            },
        }
