"""
history_parser.py
=================
Parses historical PDF timetables to populate HistoricalEntry records and
compute CoursePreference weights.

Usage (run from backend/):
    python -c "from scheduling.history_parser import run; run()"
or call run() from any Django context (e.g. post-migrate signal or shell).

The algorithm is intentional in NOT copying exact dates/slots — it only
learns *preference weights* so the scheduler is guided, not hard-coded.
"""

import re
import os
from collections import defaultdict

# Time slot boundaries (as they appear in the PDFs)
SLOT_MAP = [
    ("morning",   re.compile(r'8[:\.]15|08[:\.]15|8:15')),
    ("midday",    re.compile(r'11[:\.]00|11:00|11\.00')),
    ("afternoon", re.compile(r'2[:\.]00|14[:\.]00|2:00|14:00')),
]

# Matches things like: CSC 423 or CSC423 (with or without student count)
COURSE_RE = re.compile(r'\b([A-Z]{3})\s?(\d{3})\b')

# Venue name patterns — broad match (adjust as needed for your PDF layout)
VENUE_RE = re.compile(
    r'(PFA|Virtual Library|LH\s?\d+|Auditorium|Drawing Studio|Hall\s?\w+|'
    r'Faculty of Law|Science LR\s?\d+|Engineering|Humanities)',
    re.IGNORECASE
)

PDF_FILES = [
    r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\FINAL DRAFT First Semester_2023_2024 Exam timetable.pdf",
    r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\Final_copy_First semester_examination_timetable.pdf",
    r"c:\Users\hp\OneDrive\Desktop\Exam Timetable Project\Final_copy_25_26_First Semester Exam timetable (2).pdf",
]


def classify_slot(text_line):
    """Return a slot label based on time strings found in the line."""
    for label, pattern in SLOT_MAP:
        if pattern.search(text_line):
            return label
    return None


def parse_pdf(pdf_path):
    """
    Parse a single PDF and return a list of dicts:
      { course_code, hall_name, slot_label }
    Strategy: walk page text line by line, tracking the current slot and venue.
    """
    try:
        import pdfplumber
    except ImportError:
        print("pdfplumber not installed — run: pip install pdfplumber")
        return []

    entries = []
    source = os.path.basename(pdf_path)

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            current_slot = None
            current_venue = None

            for line in text.split('\n'):
                line = line.strip()
                if not line:
                    continue

                # Update current slot if this line mentions a time
                slot = classify_slot(line)
                if slot:
                    current_slot = slot

                # Update current venue if this line mentions a known hall
                venue_match = VENUE_RE.search(line)
                if venue_match:
                    current_venue = venue_match.group(0).strip()

                # Extract all courses on this line
                course_matches = COURSE_RE.findall(line)
                for prefix, number in course_matches:
                    code = f"{prefix} {number}"
                    if current_slot and current_venue:
                        entries.append({
                            'course_code': code,
                            'hall_name': current_venue,
                            'slot_label': current_slot,
                            'source_file': source,
                        })

    return entries


def compute_preferences(entries):
    """
    From a list of raw entries, compute per-(course, hall) frequency weights.
    Returns a dict keyed by course_code → { hall_name → {venue_w, morning_w, midday_w, afternoon_w} }
    """
    # Count occurrences
    venue_counts = defaultdict(lambda: defaultdict(int))  # course → hall → count
    slot_counts = defaultdict(lambda: defaultdict(int))   # course → slot → count
    total_counts = defaultdict(int)                        # course → total appearances

    for e in entries:
        code = e['course_code']
        hall = e['hall_name']
        slot = e['slot_label']
        venue_counts[code][hall] += 1
        slot_counts[code][slot] += 1
        total_counts[code] += 1

    # Build normalised preference table
    preferences = {}
    for code, hall_map in venue_counts.items():
        total = total_counts[code]
        preferences[code] = {}
        for hall, count in hall_map.items():
            preferences[code][hall] = {
                'venue_weight': count / total,
                'morning_weight':   slot_counts[code].get('morning', 0) / total,
                'midday_weight':    slot_counts[code].get('midday', 0) / total,
                'afternoon_weight': slot_counts[code].get('afternoon', 0) / total,
            }

    return preferences


def run(pdf_paths=None):
    """Main entry point: parse PDFs, store entries, compute + persist preferences."""
    from scheduling.models import HistoricalEntry, CoursePreference

    if pdf_paths is None:
        pdf_paths = PDF_FILES

    all_entries = []
    for path in pdf_paths:
        if not os.path.exists(path):
            print(f"  [WARN] PDF not found: {path}")
            continue
        print(f"  [PDF] Parsing: {os.path.basename(path)}")
        entries = parse_pdf(path)
        all_entries.extend(entries)
        print(f"      -> {len(entries)} raw entries extracted")

    if not all_entries:
        print("  [INFO] No entries found. Preferences will not be updated.")
        return

    # Persist raw entries (clear first to avoid duplicates on re-run)
    print(f"\n  [SAVE] Saving {len(all_entries)} HistoricalEntry records...")
    HistoricalEntry.objects.all().delete()
    HistoricalEntry.objects.bulk_create([
        HistoricalEntry(**e) for e in all_entries
    ])

    # Compute preferences
    print("  [COMPUTE] Computing preference weights...")
    prefs = compute_preferences(all_entries)

    # Persist CoursePreference (upsert)
    CoursePreference.objects.all().delete()
    pref_objects = []
    for code, hall_map in prefs.items():
        for hall, weights in hall_map.items():
            pref_objects.append(CoursePreference(
                course_code=code,
                hall_name=hall,
                **weights
            ))
    CoursePreference.objects.bulk_create(pref_objects)

    print(f"  [DONE] Learned preferences for {len(prefs)} courses across {len(pref_objects)} (course, venue) pairs.")
    return len(prefs), len(pref_objects)

