# Backend Data Scripts

Utility scripts for seeding and managing the database. All scripts must be
run from the `backend/` directory with the virtualenv active.

```bash
cd backend
venv\Scripts\activate   # Windows
# or: source venv/bin/activate  (Linux/Mac)
```

---

## Scripts

### `extract_pdf_data.py`
**Purpose:** Reads the official exam timetable PDFs and seeds courses + halls into the database.  
**Run once** when setting up a new database from scratch.
```bash
python scripts/extract_pdf_data.py
```

---

### `seed_sample_data.py`
**Purpose:** Seeds a controlled 32-course sample project for testing the scheduling algorithm.  
Covers 6 departments with deliberate capacity edge cases (tiny, large, oversized).
```bash
python scripts/seed_sample_data.py
```

---

### `seed_venues.py`
**Purpose:** Seeds/updates the Faculty of Basic & Applied Sciences venues with correct single/mixed exam capacities.
```bash
python scripts/seed_venues.py
```

---

### `import_all_venues.py`
**Purpose:** Imports all venue hall records (Basic/Applied, Law, Engineering) into the database.
```bash
python scripts/import_all_venues.py
```

---

### `import_departments.py`
**Purpose:** Imports the full list of university departments. Clears and re-creates all department records.

> ⚠️ This deletes existing department records before re-importing. Only run on a fresh setup.

```bash
python scripts/import_departments.py
```

---

### `create_timeslots.py`
**Purpose:** Creates a 2-week exam timeslot grid (Mon–Sat, 3 sessions/day) for the "University Master Data" project.
```bash
python scripts/create_timeslots.py
```

---

### `init_constraints.py`
**Purpose:** Initialises the default constraint set (student conflict, department conflict, venue capacity) for all existing projects.
```bash
python scripts/init_constraints.py
```
