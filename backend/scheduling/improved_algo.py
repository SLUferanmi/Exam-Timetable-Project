"""
Improved Scheduling Algorithm with Venue Sharing, Student Splitting & Data-Driven Preferences

KEY CHANGE: Courses that cannot be scheduled in a fully-valid slot are now FORCE-PLACED
into the next-best available slot (ignoring some constraints) instead of being dropped.
Each forced placement records exactly which constraints were violated and how many were met.
These show as RED cards in the frontend with hover details.
"""
from collections import defaultdict
from scheduling.models import ProjectCourse, ProjectHall, TimeSlot, ExamSchedule, Enrollment, CoursePreference, Constraint


class ImprovedSchedulerWithVenueSharing:
    def __init__(self, project):
        self.project = project

        self.project_courses = list(
            ProjectCourse.objects.filter(project=project, required_capacity__gt=0)
            .select_related('course')
            .order_by('course__department', '-required_capacity')
        )
        self.project_halls = list(
            ProjectHall.objects.filter(project=project, is_active=True)
            .select_related('hall')
            .order_by('-hall__capacity')
        )
        self.timeslots = list(TimeSlot.objects.filter(project=project).order_by('date', 'start_time'))

        # Load which constraints are enabled for this project
        enabled_constraints = set(
            Constraint.objects.filter(project=project, enabled=True)
            .values_list('constraint_type', flat=True)
        )
        self.check_student_conflicts   = 'student_conflict'   in enabled_constraints
        self.check_dept_conflicts      = 'department_conflict' in enabled_constraints
        self.check_venue_cap           = 'venue_capacity'      in enabled_constraints
        self.enabled_constraint_types  = enabled_constraints

        # Human-readable labels for violation reporting
        self.constraint_labels = {
            'student_conflict':   'No student has two exams at the same time',
            'department_conflict':'No department has two exams at the same time',
            'venue_capacity':     'Venue capacity must accommodate all students',
        }

        # Tracking state
        self.venue_usage      = defaultdict(lambda: defaultdict(list))
        self.student_schedule = defaultdict(set)   # student_id -> {timeslot_ids}
        self.dept_schedule    = defaultdict(set)   # department  -> {timeslot_ids}
        self.course_assignments = defaultdict(list) # pc.id -> [(ts, ph, count, guided, violations)]

        # Historical preferences
        self.preferences = defaultdict(dict)
        for pref in CoursePreference.objects.all():
            self.preferences[pref.course_code][pref.hall_name] = pref

        # Prefetch enrollments for the current project to prevent N+1 queries in conflict checks
        self.course_students = defaultdict(set)
        for enrollment in Enrollment.objects.filter(project=project).values('project_course_id', 'student_id'):
            self.course_students[enrollment['project_course_id']].add(enrollment['student_id'])

        print(f"\n📊 Scheduler initialized:")
        print(f"   Courses:  {len(self.project_courses)}")
        print(f"   Venues:   {len(self.project_halls)}")
        print(f"   Slots:    {len(self.timeslots)}")
        print(f"   Enabled constraints: {enabled_constraints or 'none'}")

    # ──────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────

    def get_course_students(self, project_course):
        return self.course_students.get(project_course.id, set())

    def check_student_conflict(self, project_course, timeslot):
        if not self.check_student_conflicts:
            return False
        for sid in self.get_course_students(project_course):
            if timeslot.id in self.student_schedule.get(sid, set()):
                return True
        return False

    def check_department_conflict(self, project_course, timeslot):
        if not self.check_dept_conflicts:
            return False
        return timeslot.id in self.dept_schedule.get(project_course.course.department, set())

    def _effective_capacity(self, project_hall, timeslot):
        hall = project_hall.hall
        existing_count = self.hall_course_count(project_hall, timeslot)
        will_be_mixed = (existing_count + 1) >= 2
        if will_be_mixed:
            limit = hall.exam_capacity_mixed
        else:
            limit = hall.exam_capacity_single
        return limit if limit is not None else hall.capacity

    def remaining_capacity(self, project_hall, timeslot):
        used = sum(alloc for _, alloc in self.venue_usage[project_hall.id][timeslot.id])
        effective = self._effective_capacity(project_hall, timeslot)
        return max(0, effective - used)

    def hall_course_count(self, project_hall, timeslot):
        return len(self.venue_usage[project_hall.id][timeslot.id])

    def _slot_label(self, timeslot):
        h = timeslot.start_time.hour
        if h < 11:  return 'morning'
        if h < 14:  return 'midday'
        return 'afternoon'

    def _preference_score(self, project_course, timeslot, project_hall):
        code = project_course.course.code
        pref = self.preferences.get(code, {}).get(project_hall.hall.name)
        is_guided = pref is not None
        venue_w = pref.venue_weight if pref else 0.0
        slot_w  = getattr(pref, f'{self._slot_label(timeslot)}_weight', 0.0) if pref else 0.0
        need = project_course.required_capacity or 1
        cap  = project_hall.hall.exam_capacity_mixed or project_hall.hall.capacity
        fit_w = (need / cap) if cap >= need else 0.0
        score = venue_w * 0.5 + slot_w * 0.3 + fit_w * 0.2
        return score, is_guided

    def can_share_venue(self, project_course, project_hall, timeslot, students_needed=None, ignore_capacity=False):
        seats_needed = students_needed if students_needed is not None else project_course.required_capacity
        if not ignore_capacity:
            available = self.remaining_capacity(project_hall, timeslot)
            if available < seats_needed:
                return False
        course_students = self.get_course_students(project_course)
        for existing_pc, _ in self.venue_usage[project_hall.id][timeslot.id]:
            if course_students & self.get_course_students(existing_pc):
                return False
        return True

    # ──────────────────────────────────────────────
    # Constraint evaluation helpers
    # ──────────────────────────────────────────────

    def _evaluate_violations(self, project_course, timeslot, project_hall):
        """
        Return a list of violation dicts for placing this course at (timeslot, hall).
        Each dict has: constraint_type, label, detail.
        """
        violations = []
        code = project_course.course.code
        dept = project_course.course.department

        # 1. Student conflict
        if 'student_conflict' in self.enabled_constraint_types:
            conflicting_students = []
            for sid in self.get_course_students(project_course):
                if timeslot.id in self.student_schedule.get(sid, set()):
                    conflicting_students.append(sid)
            if conflicting_students:
                violations.append({
                    'constraint_type': 'student_conflict',
                    'label': self.constraint_labels['student_conflict'],
                    'detail': f"{len(conflicting_students)} student(s) already have an exam in this slot."
                })

        # 2. Department conflict
        if 'department_conflict' in self.enabled_constraint_types:
            if timeslot.id in self.dept_schedule.get(dept, set()):
                # Find which course caused the conflict
                other_courses = []
                for ph_id, ts_dict in self.venue_usage.items():
                    for pc, _ in ts_dict.get(timeslot.id, []):
                        if pc.course.department == dept and pc.id != project_course.id:
                            other_courses.append(pc.course.code)
                violations.append({
                    'constraint_type': 'department_conflict',
                    'label': self.constraint_labels['department_conflict'],
                    'detail': f"Department '{dept}' already has exam(s) in this slot"
                             + (f": {', '.join(other_courses[:3])}" if other_courses else "") + "."
                })

        # 3. Venue capacity
        if 'venue_capacity' in self.enabled_constraint_types and project_hall:
            available = self.remaining_capacity(project_hall, timeslot)
            needed = project_course.required_capacity
            if available < needed:
                violations.append({
                    'constraint_type': 'venue_capacity',
                    'label': self.constraint_labels['venue_capacity'],
                    'detail': f"{needed} students need seating but only {available} seat(s) remain in {project_hall.hall.name}."
                })

        return violations

    # ──────────────────────────────────────────────
    # Assignment
    # ──────────────────────────────────────────────

    def assign_segment(self, project_course, timeslot, project_hall, student_count,
                       preference_guided=False, violations=None):
        """Record one hall segment for a course."""
        if violations is None:
            violations = []
        self.venue_usage[project_hall.id][timeslot.id].append((project_course, student_count))
        course_students = self.get_course_students(project_course)
        for sid in course_students:
            self.student_schedule[sid].add(timeslot.id)
        self.dept_schedule[project_course.course.department].add(timeslot.id)
        self.course_assignments[project_course.id].append(
            (timeslot, project_hall, student_count, preference_guided, violations)
        )

    def find_scored_halls(self, project_course, timeslot):
        candidates = []
        for ph in self.project_halls:
            if self.can_share_venue(project_course, ph, timeslot):
                score, guided = self._preference_score(project_course, timeslot, ph)
                candidates.append((score, guided, ph))
        candidates.sort(key=lambda x: -x[0])
        return candidates

    def try_split_across_halls(self, project_course, timeslot):
        students_left = project_course.required_capacity
        assignments = []
        scored_halls = []
        for ph in self.project_halls:
            if self.remaining_capacity(ph, timeslot) > 0:
                if not (self.get_course_students(project_course) &
                        {sid for pc, _ in self.venue_usage[ph.id][timeslot.id]
                         for sid in self.get_course_students(pc)}):
                    score, _ = self._preference_score(project_course, timeslot, ph)
                    scored_halls.append((score, ph))
        scored_halls.sort(key=lambda x: -x[0])
        for _, ph in scored_halls:
            if students_left <= 0:
                break
            available = self.remaining_capacity(ph, timeslot)
            take = min(available, students_left)
            assignments.append((ph, take))
            students_left -= take
        if students_left > 0:
            return []
        return assignments

    def _force_place(self, project_course):
        """
        Called when no clean slot exists. Finds the LEAST-BAD slot+hall combo,
        places the course there, and records exactly which constraints were violated.
        Returns True if placed, False if no slots/halls exist at all.
        """
        code = project_course.course.code
        needed = project_course.required_capacity

        best_option = None   # (violation_count, score, ts, ph, violations)

        for ts in self.timeslots:
            for ph in self.project_halls:
                # Skip if there are students already using this hall from the same course
                already = {pc.id for pc, _ in self.venue_usage[ph.id][ts.id]}
                if project_course.id in already:
                    continue

                violations = self._evaluate_violations(project_course, ts, ph)
                violation_count = len(violations)
                score, guided = self._preference_score(project_course, ts, ph)

                # Rank: fewer violations first, then higher preference score
                rank = (violation_count, -score)

                if best_option is None or rank < best_option[0]:
                    best_option = (rank, violation_count, score, guided, ts, ph, violations)

        if best_option is None:
            print(f"   ❌ No slots or halls available for {code} — truly unschedulable.")
            return False

        _, violation_count, score, guided, ts, ph, violations = best_option

        # Use full remaining capacity or force in if even that is 0
        available = self.remaining_capacity(ph, ts)
        alloc = min(needed, available) if available > 0 else needed

        self.assign_segment(project_course, ts, ph, alloc,
                            preference_guided=guided, violations=violations)

        slot_str = f"{ts.date} {ts.start_time}"
        viol_names = [v['constraint_type'] for v in violations]
        print(f"   ⚠️  Force-placed {code} → {ph.hall.name} @ {slot_str} "
              f"| Violated: {viol_names or 'none'}")
        return True

    # ──────────────────────────────────────────────
    # Main loop
    # ──────────────────────────────────────────────

    def schedule_exams(self):
        """Main scheduling loop. Returns list of truly unschedulable course codes."""
        print(f"\n🔄 Starting scheduling process...")
        truly_unscheduled = []
        scheduled_clean = 0
        scheduled_forced = 0

        def ts_weight(ts):
            return sum(alloc for venue_dict in self.venue_usage.values()
                       for _, alloc in venue_dict[ts.id])

        for idx, project_course in enumerate(self.project_courses, 1):
            if idx % 50 == 0:
                print(f"   Processing course {idx}/{len(self.project_courses)}...")

            assigned = False
            sorted_ts = sorted(self.timeslots, key=ts_weight)

            for timeslot in sorted_ts:
                if self.check_student_conflict(project_course, timeslot):
                    continue
                if self.check_department_conflict(project_course, timeslot):
                    continue

                # Attempt 1: Single hall (clean)
                candidates = self.find_scored_halls(project_course, timeslot)
                if candidates:
                    score, guided, best_ph = candidates[0]
                    self.assign_segment(project_course, timeslot, best_ph,
                                        project_course.required_capacity,
                                        preference_guided=guided, violations=[])
                    assigned = True
                    scheduled_clean += 1
                    break

                # Attempt 2: Split across halls (clean)
                split = self.try_split_across_halls(project_course, timeslot)
                if split:
                    for ph, count in split:
                        _, guided = self._preference_score(project_course, timeslot, ph)
                        self.assign_segment(project_course, timeslot, ph, count,
                                            preference_guided=guided, violations=[])
                    assigned = True
                    scheduled_clean += 1
                    break

            # No clean slot found — FORCE PLACE instead of dropping
            if not assigned:
                placed = self._force_place(project_course)
                if placed:
                    scheduled_forced += 1
                else:
                    truly_unscheduled.append(project_course.course.code)

        print(f"\n✅ Scheduling complete!")
        print(f"   Clean placements:  {scheduled_clean}")
        print(f"   Forced placements: {scheduled_forced}")
        print(f"   Truly unscheduled: {len(truly_unscheduled)}")

        self._enforce_minimum_pairing()
        self._create_schedule_records()
        return truly_unscheduled

    def _enforce_minimum_pairing(self):
        print("\n🔗 Enforcing minimum pairing rule...")
        moves = 0
        assigned_ids = set(self.course_assignments.keys())
        for ph in self.project_halls:
            for ts in self.timeslots:
                entries = self.venue_usage[ph.id][ts.id]
                if len(entries) == 1:
                    remaining_cap = self.remaining_capacity(ph, ts)
                    if remaining_cap <= 0:
                        continue
                    for pc in self.project_courses:
                        if pc.id in assigned_ids:
                            continue
                        if pc.required_capacity > remaining_cap:
                            continue
                        if self.check_student_conflict(pc, ts):
                            continue
                        if self.check_department_conflict(pc, ts):
                            continue
                        if not self.can_share_venue(pc, ph, ts):
                            continue
                        self.assign_segment(pc, ts, ph, pc.required_capacity, violations=[])
                        assigned_ids.add(pc.id)
                        moves += 1
                        break
        print(f"   Paired {moves} lone-course halls.")

    def _create_schedule_records(self):
        print(f"\n💾 Creating schedule records...")
        ExamSchedule.objects.filter(project=self.project).delete()
        schedules = []
        guided_count = 0
        forced_count = 0

        # Total enabled constraints (for constraints_total field)
        total_constraints = len(self.enabled_constraint_types)

        courses_map = {pc.id: pc for pc in self.project_courses}

        for pc_id, segments in self.course_assignments.items():
            pc = courses_map.get(pc_id)
            if not pc:
                continue
            for timeslot, ph, student_count, guided, violations in segments:
                met = total_constraints - len(violations)
                schedules.append(ExamSchedule(
                    project=self.project,
                    project_course=pc,
                    timeslot=timeslot,
                    project_hall=ph,
                    student_allocation=student_count,
                    preference_guided=guided,
                    constraint_violations=violations,
                    constraints_total=total_constraints,
                    constraints_met=met,
                ))
                if guided:
                    guided_count += 1
                if violations:
                    forced_count += 1

        ExamSchedule.objects.bulk_create(schedules)
        print(f"   ✓ Created {len(schedules)} schedule records")
        print(f"   📈 Data-guided: {guided_count}  |  ⚠️  Forced (violated): {forced_count}")
        self._print_venue_stats()

    def _print_venue_stats(self):
        print(f"\n📊 Venue Utilization:")
        total_used = 0
        total_avail = 0
        for ph in self.project_halls:
            hall_students = sum(
                alloc
                for ts_dict in [self.venue_usage[ph.id]]
                for entries in ts_dict.values()
                for _, alloc in entries
            )
            if hall_students > 0:
                avail = ph.hall.capacity * len(self.timeslots)
                pct = (hall_students / avail) * 100
                print(f"   {ph.hall.name}: {pct:.1f}% utilized")
            total_used += hall_students
            total_avail += ph.hall.capacity * len(self.timeslots)
        overall = (total_used / total_avail * 100) if total_avail else 0
        print(f"\n   Overall Utilization: {overall:.1f}%")
