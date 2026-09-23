from __future__ import annotations
import os
import uuid
from datetime import date, datetime, timedelta, timezone

try:
    from pymongo import MongoClient

    _HAS_PYMONGO = True
except Exception:
    _HAS_PYMONGO = False


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def nid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


class MemoryCollection:
    def __init__(self):
        self.docs: list[dict] = []

    @staticmethod
    def _match(doc: dict, q: dict | None) -> bool:
        for k, v in (q or {}).items():
            if isinstance(v, dict) and "$in" in v:
                if doc.get(k) not in v["$in"]:
                    return False
            elif doc.get(k) != v:
                return False
        return True

    def find(self, q=None, sort=None, limit=0):
        rows = [d for d in self.docs if self._match(d, q)]
        if sort:
            for key, direction in reversed(list(sort)):
                rows.sort(key=lambda d: str(d.get(key, "")), reverse=direction < 0)
        if limit:
            rows = rows[:limit]
        return [dict(r) for r in rows]

    def find_one(self, q):
        rows = self.find(q)
        return rows[0] if rows else None

    def insert_one(self, doc):
        doc = dict(doc)
        doc.setdefault("_id", nid())
        self.docs.append(doc)
        return {"inserted_id": doc["_id"]}

    def update_one(self, q, update):
        for d in self.docs:
            if self._match(d, q):
                d.update((update or {}).get("$set", {}))
                return {"matched": 1}
        return {"matched": 0}

    def delete_one(self, q):
        for i, d in enumerate(self.docs):
            if self._match(d, q):
                del self.docs[i]
                return {"deleted": 1}
        return {"deleted": 0}

    def count_documents(self, q=None):
        return len(self.find(q))


class MongoCollection:
    def __init__(self, col):
        self.c = col

    def find(self, q=None, sort=None, limit=0):
        cur = self.c.find(q or {})
        if sort:
            cur = cur.sort(list(sort))
        if limit:
            cur = cur.limit(limit)
        out = []
        for d in cur:
            d["_id"] = str(d["_id"])
            out.append(d)
        return out

    def find_one(self, q):
        d = self.c.find_one(q or {})
        if d:
            d["_id"] = str(d["_id"])
        return d

    def insert_one(self, doc):
        doc = dict(doc)
        doc.setdefault("_id", nid())
        r = self.c.insert_one(doc)
        return {"inserted_id": str(r.inserted_id)}

    def update_one(self, q, update):
        r = self.c.update_one(q or {}, update or {})
        return {"matched": r.matched_count}

    def delete_one(self, q):
        r = self.c.delete_one(q or {})
        return {"deleted": r.deleted_count}

    def count_documents(self, q=None):
        return self.c.count_documents(q or {})


class Store:
    def __init__(self):
        self.mode = "memory"
        self._mem: dict[str, MemoryCollection] = {}
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        if _HAS_PYMONGO:
            try:
                client = MongoClient(uri, serverSelectionTimeoutMS=1200)
                client.admin.command("ping")
                self.db = client[os.getenv("DB_NAME", "internova")]
                self.mode = "mongo"
                print(f"[internova] connected to MongoDB ({uri})", flush=True)
            except Exception as e:
                print(f"[internova] MongoDB unreachable ({e}); using in-memory store", flush=True)

    def col(self, name: str):
        if self.mode == "mongo":
            return MongoCollection(self.db[name])
        if name not in self._mem:
            self._mem[name] = MemoryCollection()
        return self._mem[name]


store = Store()


                                                                                  
def _attendance_rows(alloc_id: str, start: date, end: date, absent=(), leave=()):
    rows = []
    d = start
    i = 0
    while d <= end:
        if d.weekday() < 5:
            ds = d.isoformat()
            if ds in absent:
                rows.append({"_id": nid("at_"), "allocationId": alloc_id, "date": ds,
                             "status": "absent", "note": "Uninformed absence", "createdAt": ds})
            elif ds in leave:
                rows.append({"_id": nid("at_"), "allocationId": alloc_id, "date": ds,
                             "status": "leave", "note": "Approved leave", "createdAt": ds})
            else:
                ci = f"09:{10 + (i * 7) % 40:02d}"
                rows.append({"_id": nid("at_"), "allocationId": alloc_id, "date": ds,
                             "status": "present", "checkIn": ci, "checkOut": "18:05",
                             "hours": 7 + (i % 2) * 0.5, "note": "", "createdAt": ds})
            i += 1
        d += timedelta(days=1)
    return rows


def seed_if_empty():
    from .auth import hash_password                                

    users = store.col("users")
    if users.count_documents({}) > 0:
        return
    print("[internova] seeding demo data …", flush=True)
    pw = hash_password("demo1234")
    C = store.col

    for u in [
        {"_id": "u_arav", "name": "Aarav Sharma", "email": "student@demo.internova.app",
         "passwordHash": pw, "role": "student", "college": "Coimbatore Institute of Technology",
         "degree": "B.E. Computer Science", "year": "3rd Year", "cgpa": "8.7",
         "phone": "+91 98765 43210", "location": "Coimbatore, IN",
         "bio": "Full-stack leaning frontend developer. I love design systems, motion and clean APIs.",
         "skills": ["React", "TypeScript", "Python", "Tailwind CSS", "MongoDB", "Git"],
         "resumeName": "aarav_resume.pdf", "profileComplete": True, "avatar": "AS",
         "color": "#7b39fc", "createdAt": "2026-06-02T10:00:00"},
        {"_id": "u_diya", "name": "Diya Patel", "email": "diya@demo.internova.app",
         "passwordHash": pw, "role": "student", "college": "PSG College of Technology",
         "degree": "B.Tech Information Technology", "year": "2nd Year", "cgpa": "9.1",
         "phone": "+91 98111 22233", "location": "Coimbatore, IN",
         "bio": "Data enthusiast turning messy datasets into clear stories.",
         "skills": ["Python", "SQL", "Pandas", "Power BI", "Excel"],
         "resumeName": "diya_resume.pdf", "profileComplete": True, "avatar": "DP",
         "color": "#0ea5e9", "createdAt": "2026-06-05T10:00:00"},
        {"_id": "u_arjun", "name": "Arjun Kumar", "email": "arjun@demo.internova.app",
         "passwordHash": pw, "role": "student", "college": "Anna University",
         "degree": "B.E. Computer Science", "year": "4th Year", "cgpa": "7.4",
         "phone": "+91 90000 11122", "location": "Chennai, IN",
         "bio": "Aspiring DevOps engineer, automating everything I touch.",
         "skills": ["Linux", "Docker", "AWS", "Bash", "Python"],
         "resumeName": "arjun_resume.pdf", "profileComplete": True, "avatar": "AK",
         "color": "#f59e0b", "createdAt": "2026-06-08T10:00:00"},
        {"_id": "u_technova", "name": "Priya Nair", "email": "company@demo.internova.app",
         "passwordHash": pw, "role": "company", "phone": "+91 80471 22334",
         "company": {"name": "TechNova Solutions", "industry": "SaaS / Developer Tools",
                     "size": "200–500", "location": "Bengaluru, IN",
                     "website": "https://technova.example.com", "founded": "2019",
                     "about": "TechNova builds analytics infrastructure for product teams. Our interns ship to production from week two."},
         "avatar": "TN", "color": "#7b39fc", "createdAt": "2026-05-20T10:00:00"},
        {"_id": "u_datawings", "name": "Rahul Verma", "email": "rahul@datawings.io",
         "passwordHash": pw, "role": "company", "phone": "+91 80471 99001",
         "company": {"name": "DataWings Analytics", "industry": "Data & AI",
                     "size": "50–200", "location": "Hyderabad, IN",
                     "website": "https://datawings.example.com", "founded": "2021",
                     "about": "DataWings helps retailers forecast demand with machine learning."},
         "avatar": "DW", "color": "#10b981", "createdAt": "2026-05-25T10:00:00"},
        {"_id": "u_kavya", "name": "Dr. Kavya Menon", "email": "mentor@demo.internova.app",
         "passwordHash": pw, "role": "mentor", "phone": "+91 98400 12345",
         "location": "Chennai, IN", "expertise": ["Full-Stack Development", "Cloud", "System Design"],
         "experience": "12 years", "organisation": "InterNova Mentor Network",
         "bio": "Former staff engineer. I mentor interns on shipping quality software, not just writing code.",
         "avatar": "KM", "color": "#ec4899", "createdAt": "2026-05-15T10:00:00"},
        {"_id": "u_admin", "name": "Platform Admin", "email": "admin@demo.internova.app",
         "passwordHash": pw, "role": "admin", "avatar": "AD", "color": "#64748b",
         "createdAt": "2026-05-01T10:00:00"},
    ]:
        users.insert_one(u)

    internships = [
        {"_id": "int_fe", "title": "Frontend Developer Intern", "companyId": "u_technova",
         "companyName": "TechNova Solutions", "domain": "Web Development",
         "skills": ["React", "TypeScript", "Tailwind CSS", "Git"], "mode": "Remote",
         "location": "Remote (India)", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹15,000 / month", "openings": 4, "startDate": "2026-07-01",
         "deadline": "2026-06-25", "postedAt": "2026-06-01", "status": "open",
         "description": "Join the Design Engineering pod and help build the analytics dashboard used by 2,000+ teams. You will own real UI surfaces, from data-dense tables to animated onboarding flows.",
         "responsibilities": ["Build responsive React + TypeScript interfaces", "Implement design-system components in Tailwind",
                              "Write unit tests for critical UI logic", "Ship weekly behind feature flags with mentor review"],
         "createdAt": "2026-06-01T10:00:00"},
        {"_id": "int_be", "title": "Backend Developer Intern", "companyId": "u_technova",
         "companyName": "TechNova Solutions", "domain": "Web Development",
         "skills": ["Python", "FastAPI", "MongoDB", "Docker"], "mode": "Hybrid",
         "location": "Bengaluru, IN", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹18,000 / month", "openings": 3, "startDate": "2026-10-01",
         "deadline": "2026-09-25", "postedAt": "2026-08-20", "status": "open",
         "description": "Work on ingestion APIs that process millions of events a day. Learn production Python: profiling, caching, queues and clean architecture.",
         "responsibilities": ["Design and build FastAPI endpoints", "Model data in MongoDB",
                              "Add observability: logs, metrics, traces", "Participate in on-call shadowing"],
         "createdAt": "2026-08-20T10:00:00"},
        {"_id": "int_ml", "title": "Machine Learning Intern", "companyId": "u_datawings",
         "companyName": "DataWings Analytics", "domain": "AI / ML",
         "skills": ["Python", "PyTorch", "SQL", "Statistics"], "mode": "Remote",
         "location": "Remote (India)", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹20,000 / month", "openings": 2, "startDate": "2026-10-15",
         "deadline": "2026-09-30", "postedAt": "2026-08-28", "status": "open",
         "description": "Train and evaluate demand-forecasting models on real retail data, and learn how ML actually gets deployed and monitored.",
         "responsibilities": ["Explore and clean large retail datasets", "Train baseline and deep-learning forecasters",
                              "Build evaluation dashboards", "Document experiments rigorously"],
         "createdAt": "2026-08-28T10:00:00"},
        {"_id": "int_ux", "title": "UI/UX Design Intern", "companyId": "u_technova",
         "companyName": "TechNova Solutions", "domain": "Design",
         "skills": ["Figma", "Prototyping", "User Research", "Design Systems"], "mode": "Remote",
         "location": "Remote (India)", "duration": "4 months", "durationMonths": 4,
         "stipend": "₹12,000 / month", "openings": 2, "startDate": "2026-10-01",
         "deadline": "2026-09-22", "postedAt": "2026-09-01", "status": "open",
         "description": "Own end-to-end design problems: research, flows, hi-fi UI and usability testing with real users.",
         "responsibilities": ["Run user interviews and synthesize insights", "Design flows and hi-fi screens in Figma",
                              "Maintain design-system documentation", "Present work in weekly design crit"],
         "createdAt": "2026-09-01T10:00:00"},
        {"_id": "int_da", "title": "Data Analyst Intern", "companyId": "u_datawings",
         "companyName": "DataWings Analytics", "domain": "Data",
         "skills": ["Python", "SQL", "Pandas", "Power BI"], "mode": "On-site",
         "location": "Hyderabad, IN", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹14,000 / month", "openings": 3, "startDate": "2026-07-15",
         "deadline": "2026-07-01", "postedAt": "2026-06-10", "status": "open",
         "description": "Turn raw event data into dashboards and insights that shape the product roadmap.",
         "responsibilities": ["Build SQL models and dbt pipelines", "Ship Power BI dashboards",
                              "Analyse funnels and retention cohorts", "Present findings to stakeholders"],
         "createdAt": "2026-06-10T10:00:00"},
        {"_id": "int_do", "title": "DevOps Intern", "companyId": "u_technova",
         "companyName": "TechNova Solutions", "domain": "DevOps",
         "skills": ["Linux", "Docker", "AWS", "CI/CD"], "mode": "Hybrid",
         "location": "Bengaluru, IN", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹16,000 / month", "openings": 2, "startDate": "2026-08-01",
         "deadline": "2026-07-20", "postedAt": "2026-06-25", "status": "open",
         "description": "Learn how production stays up: containers, pipelines, infrastructure-as-code and incident response.",
         "responsibilities": ["Containerise services with Docker", "Maintain GitHub Actions pipelines",
                              "Write Terraform for staging environments", "Shadow incident reviews"],
         "createdAt": "2026-06-25T10:00:00"},
        {"_id": "int_mob", "title": "Mobile App Intern (Flutter)", "companyId": "u_datawings",
         "companyName": "DataWings Analytics", "domain": "Mobile",
         "skills": ["Flutter", "Dart", "REST APIs", "Firebase"], "mode": "Remote",
         "location": "Remote (India)", "duration": "5 months", "durationMonths": 5,
         "stipend": "₹13,000 / month", "openings": 2, "startDate": "2026-11-01",
         "deadline": "2026-10-10", "postedAt": "2026-09-05", "status": "open",
         "description": "Build the companion mobile app for store managers: offline-first, fast and delightful.",
         "responsibilities": ["Build Flutter screens from Figma", "Integrate REST APIs with caching",
                              "Write widget and integration tests", "Publish internal beta builds"],
         "createdAt": "2026-09-05T10:00:00"},
        {"_id": "int_sec", "title": "Cybersecurity Intern", "companyId": "u_technova",
         "companyName": "TechNova Solutions", "domain": "Security",
         "skills": ["Networking", "Linux", "OWASP", "Python"], "mode": "On-site",
         "location": "Bengaluru, IN", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹17,000 / month", "openings": 1, "startDate": "2026-11-01",
         "deadline": "2026-10-15", "postedAt": "2026-09-08", "status": "open",
         "description": "Hunt vulnerabilities, harden infrastructure and learn security engineering from practitioners.",
         "responsibilities": ["Run vulnerability scans and triage findings", "Review code for OWASP Top-10 issues",
                              "Harden cloud configurations", "Document security runbooks"],
         "createdAt": "2026-09-08T10:00:00"},
        {"_id": "int_past", "title": "Web Development Intern", "companyId": "u_technova",
         "companyName": "PixelKraft Studio", "domain": "Web Development",
         "skills": ["HTML", "CSS", "JavaScript", "React"], "mode": "Remote",
         "location": "Remote (India)", "duration": "6 months", "durationMonths": 6,
         "stipend": "₹8,000 / month", "openings": 5, "startDate": "2026-01-05",
         "deadline": "2025-12-20", "postedAt": "2025-12-01", "status": "closed",
         "description": "A completed Winter 2026 cohort — kept for certificate history.",
         "responsibilities": ["Build marketing sites", "Maintain component library"],
         "createdAt": "2025-12-01T10:00:00"},
    ]
    for it in internships:
        C("internships").insert_one(it)

    for a in [
        {"_id": "ap_arav_fe", "studentId": "u_arav", "internshipId": "int_fe",
         "status": "allocated", "coverLetter": "I have built three production-style React apps and I care deeply about UI craft. TechNova's dashboard work is exactly where I want to grow.",
         "appliedAt": "2026-06-08T09:00:00", "updatedAt": "2026-06-28T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-06-08"}, {"s": "under_review", "at": "2026-06-12"},
                       {"s": "shortlisted", "at": "2026-06-18"}, {"s": "selected", "at": "2026-06-25"},
                       {"s": "allocated", "at": "2026-06-28"}]},
        {"_id": "ap_arav_be", "studentId": "u_arav", "internshipId": "int_be",
         "status": "shortlisted", "coverLetter": "I built a FastAPI + MongoDB event logger that handles my homelab telemetry. I want to learn production backend patterns at scale.",
         "appliedAt": "2026-08-25T09:00:00", "updatedAt": "2026-09-10T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-08-25"}, {"s": "under_review", "at": "2026-09-02"},
                       {"s": "shortlisted", "at": "2026-09-10"}]},
        {"_id": "ap_arav_ml", "studentId": "u_arav", "internshipId": "int_ml",
         "status": "under_review", "coverLetter": "Statistics minor with two Kaggle medals. Forecasting demand for real retailers would be a dream first ML role.",
         "appliedAt": "2026-09-02T09:00:00", "updatedAt": "2026-09-06T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-09-02"}, {"s": "under_review", "at": "2026-09-06"}]},
        {"_id": "ap_diya_fe", "studentId": "u_diya", "internshipId": "int_fe",
         "status": "applied", "coverLetter": "Frontend-curious data student here — I have shipped two React dashboards for college fests and want to go deeper.",
         "appliedAt": "2026-09-15T09:00:00", "updatedAt": "2026-09-15T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-09-15"}]},
        {"_id": "ap_arjun_fe", "studentId": "u_arjun", "internshipId": "int_fe",
         "status": "under_review", "coverLetter": "I maintain our department website and its CI pipeline. Comfortable across the stack, strongest in JS/TS.",
         "appliedAt": "2026-09-05T09:00:00", "updatedAt": "2026-09-09T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-09-05"}, {"s": "under_review", "at": "2026-09-09"}]},
        {"_id": "ap_diya_da", "studentId": "u_diya", "internshipId": "int_da",
         "status": "allocated", "coverLetter": "SQL + Pandas daily driver. I want my analyses to move real business metrics.",
         "appliedAt": "2026-06-12T09:00:00", "updatedAt": "2026-07-10T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-06-12"}, {"s": "under_review", "at": "2026-06-20"},
                       {"s": "shortlisted", "at": "2026-06-30"}, {"s": "selected", "at": "2026-07-05"},
                       {"s": "allocated", "at": "2026-07-10"}]},
        {"_id": "ap_arjun_do", "studentId": "u_arjun", "internshipId": "int_do",
         "status": "allocated", "coverLetter": "Homelab with 6 services behind Traefik, all IaC. Ready to learn production DevOps properly.",
         "appliedAt": "2026-06-20T09:00:00", "updatedAt": "2026-07-25T09:00:00",
         "timeline": [{"s": "applied", "at": "2026-06-20"}, {"s": "under_review", "at": "2026-07-02"},
                       {"s": "shortlisted", "at": "2026-07-12"}, {"s": "selected", "at": "2026-07-18"},
                       {"s": "allocated", "at": "2026-07-25"}]},
    ]:
        C("applications").insert_one(a)

    for al in [
        {"_id": "al_arav", "studentId": "u_arav", "internshipId": "int_fe",
         "companyId": "u_technova", "mentorId": "u_kavya", "status": "active",
         "startDate": "2026-07-01", "endDate": "2026-12-31", "progress": 62,
         "createdAt": "2026-06-28T09:00:00", "updatedAt": "2026-09-17T18:00:00"},
        {"_id": "al_diya", "studentId": "u_diya", "internshipId": "int_da",
         "companyId": "u_datawings", "mentorId": "u_kavya", "status": "active",
         "startDate": "2026-07-15", "endDate": "2027-01-14", "progress": 45,
         "createdAt": "2026-07-10T09:00:00", "updatedAt": "2026-09-16T18:00:00"},
        {"_id": "al_arjun", "studentId": "u_arjun", "internshipId": "int_do",
         "companyId": "u_technova", "mentorId": "u_kavya", "status": "active",
         "startDate": "2026-08-01", "endDate": "2027-01-31", "progress": 28,
         "flag": "at_risk", "createdAt": "2026-07-25T09:00:00", "updatedAt": "2026-09-17T18:00:00"},
        {"_id": "al_arav_past", "studentId": "u_arav", "internshipId": "int_past",
         "companyId": "u_technova", "mentorId": "u_kavya", "status": "completed",
         "startDate": "2026-01-05", "endDate": "2026-06-30", "progress": 100,
         "createdAt": "2025-12-28T09:00:00", "updatedAt": "2026-06-30T18:00:00"},
    ]:
        C("allocations").insert_one(al)

    for r in _attendance_rows("al_arav", date(2026, 8, 24), date(2026, 9, 17),
                              absent=("2026-08-27", "2026-09-04"), leave=("2026-09-11",)):
        C("attendance").insert_one(r)
    for r in _attendance_rows("al_diya", date(2026, 9, 7), date(2026, 9, 17), absent=("2026-09-09",)):
        C("attendance").insert_one(r)
    for r in _attendance_rows("al_arjun", date(2026, 9, 7), date(2026, 9, 17),
                              absent=("2026-09-08", "2026-09-10", "2026-09-14", "2026-09-16")):
        C("attendance").insert_one(r)

    for u in [
        {"_id": "up_1", "allocationId": "al_arav", "date": "2026-09-11",
         "workedOn": "Migrated the filters panel to the new design-system tokens.",
         "completed": "Shipped filter chips + URL-synced state behind a flag.",
         "learned": "How useSearchParams composes with server state without loops.",
         "blockers": "None.", "hours": 7.5, "reviewStatus": "approved",
         "mentorComment": "Clean PR. Love the URL-state approach.", "createdAt": "2026-09-11T18:00:00"},
        {"_id": "up_2", "allocationId": "al_arav", "date": "2026-09-14",
         "workedOn": "Built the usage-charts section with lazy loading.",
         "completed": "Charts render in under 200ms on throttled 4G.",
         "learned": "Canvas vs SVG trade-offs for 10k-point series.",
         "blockers": "Waiting on final copy for empty states.", "hours": 8,
         "reviewStatus": "approved", "mentorComment": "Great perf instincts. Copy is with design.",
         "createdAt": "2026-09-14T18:00:00"},
        {"_id": "up_3", "allocationId": "al_arav", "date": "2026-09-15",
         "workedOn": "Empty states + error boundaries for the dashboard.",
         "completed": "All dashboard routes now fail gracefully with retry.",
         "learned": "Error boundary placement strategies.", "blockers": "None.", "hours": 7,
         "reviewStatus": "approved", "mentorComment": "", "createdAt": "2026-09-15T18:00:00"},
        {"_id": "up_4", "allocationId": "al_arav", "date": "2026-09-16",
         "workedOn": "Wrote integration tests for the export-to-CSV flow.",
         "completed": "Coverage on export utils is now 94%.",
         "learned": "Testing file downloads with Playwright.", "blockers": "None.", "hours": 7.5,
         "reviewStatus": "approved", "mentorComment": "Solid. Add a test for the 50k-row case next.",
         "createdAt": "2026-09-16T18:00:00"},
        {"_id": "up_5", "allocationId": "al_arav", "date": "2026-09-17",
         "workedOn": "Started the notifications centre UI.",
         "completed": "Scaffolded components and API wiring.",
         "learned": "Optimistic updates for read-state.", "blockers": "API returns 500 on mark-all-read — flagged to backend.",
         "hours": 6.5, "reviewStatus": "pending", "mentorComment": "",
         "createdAt": "2026-09-17T18:00:00"},
        {"_id": "up_d1", "allocationId": "al_diya", "date": "2026-09-16",
         "workedOn": "Cohort retention model for the festival SKU set.",
         "completed": "Draft model + sanity checks.", "learned": "Survival analysis basics.",
         "blockers": "None.", "hours": 7, "reviewStatus": "pending", "mentorComment": "",
         "createdAt": "2026-09-16T18:00:00"},
        {"_id": "up_k1", "allocationId": "al_arjun", "date": "2026-09-15",
         "workedOn": "Fixed the staging pipeline cache.",
         "completed": "Pipeline is green again.", "learned": "Docker layer caching.",
         "blockers": "None.", "hours": 5, "reviewStatus": "pending", "mentorComment": "",
         "createdAt": "2026-09-15T18:00:00"},
    ]:
        C("updates").insert_one(u)

    for t in [
        {"_id": "t_1", "allocationId": "al_arav", "title": "Design-token migration for filters",
         "description": "Move the filters panel to v2 tokens and add URL-synced state.",
         "status": "completed", "priority": "high", "dueDate": "2026-09-11",
         "comments": [{"by": "Dr. Kavya Menon", "text": "Merged. Nice work.", "at": "2026-09-11"}],
         "createdAt": "2026-09-07T10:00:00"},
        {"_id": "t_2", "allocationId": "al_arav", "title": "Usage charts with lazy loading",
         "description": "Render 10k-point series smoothly on low-end devices.",
         "status": "completed", "priority": "high", "dueDate": "2026-09-14",
         "comments": [], "createdAt": "2026-09-08T10:00:00"},
        {"_id": "t_3", "allocationId": "al_arav", "title": "Dashboard empty states",
         "description": "Every dashboard route needs a designed empty + error state.",
         "status": "review", "priority": "medium", "dueDate": "2026-09-16",
         "comments": [{"by": "Aarav Sharma", "text": "Ready for review.", "at": "2026-09-16"}],
         "createdAt": "2026-09-10T10:00:00"},
        {"_id": "t_4", "allocationId": "al_arav", "title": "Export-to-CSV test coverage",
         "description": "Cover export utils including the 50k-row edge case.",
         "status": "review", "priority": "medium", "dueDate": "2026-09-18",
         "comments": [], "createdAt": "2026-09-12T10:00:00"},
        {"_id": "t_5", "allocationId": "al_arav", "title": "Notifications centre UI",
         "description": "Inbox-style centre with optimistic read-state.",
         "status": "in_progress", "priority": "high", "dueDate": "2026-09-24",
         "comments": [], "createdAt": "2026-09-15T10:00:00"},
        {"_id": "t_6", "allocationId": "al_arav", "title": "API integration tests",
         "description": "Contract tests for the new notification endpoints.",
         "status": "in_progress", "priority": "medium", "dueDate": "2026-09-25",
         "comments": [], "createdAt": "2026-09-16T10:00:00"},
        {"_id": "t_7", "allocationId": "al_arav", "title": "Accessibility audit pass",
         "description": "Keyboard nav + screen-reader pass on dashboard routes.",
         "status": "todo", "priority": "low", "dueDate": "2026-10-02",
         "comments": [], "createdAt": "2026-09-16T10:00:00"},
        {"_id": "t_8", "allocationId": "al_arav", "title": "Onboarding tour revamp",
         "description": "Shorter, skippable product tour for new workspaces.",
         "status": "todo", "priority": "low", "dueDate": "2026-10-09",
         "comments": [], "createdAt": "2026-09-17T10:00:00"},
        {"_id": "t_d1", "allocationId": "al_diya", "title": "Retention cohort model",
         "description": "Festival SKU retention cohorts.", "status": "review",
         "priority": "high", "dueDate": "2026-09-18", "comments": [],
         "createdAt": "2026-09-12T10:00:00"},
        {"_id": "t_d2", "allocationId": "al_diya", "title": "Executive KPI dashboard",
         "description": "Weekly KPI board for leadership.", "status": "in_progress",
         "priority": "medium", "dueDate": "2026-09-26", "comments": [],
         "createdAt": "2026-09-14T10:00:00"},
        {"_id": "t_k1", "allocationId": "al_arjun", "title": "Staging pipeline cache fix",
         "description": "Restore Docker layer caching in CI.", "status": "review",
         "priority": "high", "dueDate": "2026-09-16", "comments": [],
         "createdAt": "2026-09-13T10:00:00"},
        {"_id": "t_k2", "allocationId": "al_arjun", "title": "Terraform staging env",
         "description": "IaC for the staging cluster.", "status": "todo",
         "priority": "medium", "dueDate": "2026-09-30", "comments": [],
         "createdAt": "2026-09-15T10:00:00"},
    ]:
        C("tasks").insert_one(t)

    for m in [
        {"_id": "m_1", "allocationId": "al_arav", "title": "Onboarding & Setup",
         "description": "Environment, codebase tour, first merged PR.",
         "status": "completed", "percent": 100, "dueDate": "2026-07-31",
         "tasks": ["t_1"], "createdAt": "2026-07-01T10:00:00"},
        {"_id": "m_2", "allocationId": "al_arav", "title": "Core Feature Sprint",
         "description": "Own and ship dashboard surfaces end-to-end.",
         "status": "completed", "percent": 100, "dueDate": "2026-08-29",
         "tasks": ["t_2", "t_3"], "createdAt": "2026-08-01T10:00:00"},
        {"_id": "m_3", "allocationId": "al_arav", "title": "Integration & Polish",
         "description": "Harden flows: tests, empty states, accessibility.",
         "status": "in_progress", "percent": 60, "dueDate": "2026-10-10",
         "tasks": ["t_4", "t_5", "t_6", "t_7"], "createdAt": "2026-08-30T10:00:00"},
        {"_id": "m_4", "allocationId": "al_arav", "title": "Final Demo & Handover",
         "description": "Showcase, docs and knowledge transfer.",
         "status": "upcoming", "percent": 0, "dueDate": "2026-12-20",
         "tasks": ["t_8"], "createdAt": "2026-08-30T10:00:00"},
        {"_id": "m_d1", "allocationId": "al_diya", "title": "Data Foundations",
         "description": "Warehouse orientation + first models.", "status": "completed",
         "percent": 100, "dueDate": "2026-08-15", "tasks": [], "createdAt": "2026-07-15T10:00:00"},
        {"_id": "m_d2", "allocationId": "al_diya", "title": "Insights Delivery",
         "description": "Dashboards + stakeholder readouts.", "status": "in_progress",
         "percent": 40, "dueDate": "2026-10-15", "tasks": ["t_d1", "t_d2"],
         "createdAt": "2026-08-16T10:00:00"},
        {"_id": "m_k1", "allocationId": "al_arjun", "title": "CI Foundations",
         "description": "Pipelines green and documented.", "status": "in_progress",
         "percent": 35, "dueDate": "2026-09-30", "tasks": ["t_k1", "t_k2"],
         "createdAt": "2026-08-01T10:00:00"},
    ]:
        C("milestones").insert_one(m)

    for se in [
        {"_id": "se_1", "allocationId": "al_arav", "title": "Weekly 1:1 - Sprint review",
         "description": "Walk through the charts sprint + plan the notifications centre.",
         "date": "2026-09-22T16:00:00", "durationMin": 30,
         "meetLink": "https://meet.google.com/nova-arav-weekly", "status": "confirmed",
         "proposedBy": "u_kavya", "notes": "", "actionItems": [],
         "createdAt": "2026-09-17T10:00:00", "updatedAt": "2026-09-17T10:00:00", "remindersSent": []},
        {"_id": "se_2", "allocationId": "al_arav", "title": "Kickoff & goal setting",
         "description": "First session - expectations and milestone map.",
         "date": "2026-09-11T16:00:00", "durationMin": 45, "meetLink": "",
         "status": "completed", "proposedBy": "u_kavya",
         "notes": "Aarav is strong on React. Focus next: testing discipline + perf budgets.",
         "actionItems": [{"text": "Set up Playwright", "done": True},
                         {"text": "Draft perf budget doc", "done": True}],
         "createdAt": "2026-09-08T10:00:00", "updatedAt": "2026-09-11T17:00:00", "remindersSent": []},
        {"_id": "se_3", "allocationId": "al_diya", "title": "Portfolio review",
         "description": "Diya requested feedback on the retention model draft.",
         "date": "2026-09-19T11:30:00", "durationMin": 30, "meetLink": "",
         "status": "proposed", "proposedBy": "u_diya", "notes": "", "actionItems": [],
         "createdAt": "2026-09-17T14:00:00", "updatedAt": "2026-09-17T14:00:00", "remindersSent": []},
    ]:
        C("sessions").insert_one(se)

    for f in [
        {"_id": "f_1", "allocationId": "al_arav", "fromId": "u_kavya",
         "fromName": "Dr. Kavya Menon", "category": "Sprint review", "rating": 5,
         "message": "Aarav's second sprint was genuinely strong — independent debugging, thoughtful PRs and clear daily updates. Next: start reviewing peers' code.",
         "createdAt": "2026-09-05T15:00:00"},
        {"_id": "f_2", "allocationId": "al_arav", "fromId": "u_kavya",
         "fromName": "Dr. Kavya Menon", "category": "Technical growth", "rating": 4,
         "message": "Good progress on testing discipline. Keep pushing coverage on edge cases before marking tasks for review.",
         "createdAt": "2026-09-16T15:00:00"},
    ]:
        C("feedback").insert_one(f)

    C("evaluations").insert_one(
        {"_id": "ev_past", "allocationId": "al_arav_past", "evaluatorName": "PixelKraft Studio",
         "scores": {"technical": 9, "communication": 8, "professionalism": 9,
                    "problemSolving": 8, "overall": 8.5},
         "comments": "Aarav shipped reliably all cohort and grew enormously in code quality. Highly recommended.",
         "createdAt": "2026-06-30T15:00:00"})

    for c in [
        {"_id": "INT-2026-004821", "studentId": "u_arav", "studentName": "Aarav Sharma",
         "companyName": "PixelKraft Studio", "role": "Web Development Intern",
         "duration": "Jan 2026 – Jun 2026", "completionDate": "2026-06-30",
         "status": "valid", "grade": "A",
         "skills": ["HTML", "CSS", "JavaScript", "React"],
         "issuedAt": "2026-07-02T10:00:00", "createdAt": "2026-07-02T10:00:00"},
        {"_id": "INT-2026-003107", "studentId": "u_diya", "studentName": "Diya Patel",
         "companyName": "DataWings Analytics", "role": "Data Intern (Winter Cohort)",
         "duration": "Dec 2025 – Feb 2026", "completionDate": "2026-02-27",
         "status": "valid", "grade": "A+",
         "skills": ["SQL", "Excel", "Power BI"],
         "issuedAt": "2026-03-02T10:00:00", "createdAt": "2026-03-02T10:00:00"},
        {"_id": "INT-2025-000942", "studentId": "u_arjun", "studentName": "Arjun Kumar",
         "companyName": "CloudNest", "role": "IT Support Intern",
         "duration": "Jun 2025 – Aug 2025", "completionDate": "2025-08-29",
         "status": "revoked", "grade": "B",
         "skills": ["Linux", "Networking"],
         "issuedAt": "2025-09-01T10:00:00", "createdAt": "2025-09-01T10:00:00"},
    ]:
        C("certificates").insert_one(c)

    for n in [
        {"userId": "u_arav", "title": "Application shortlisted",
         "body": "TechNova Solutions shortlisted you for Backend Developer Intern.",
         "link": "/dashboard/student?tab=applications", "kind": "success", "read": False,
         "createdAt": "2026-09-10T11:00:00"},
        {"userId": "u_arav", "title": "New task assigned",
         "body": "API integration tests — due Sep 25.", "link": "/dashboard/student?tab=internship",
         "kind": "task", "read": False, "createdAt": "2026-09-16T10:00:00"},
        {"userId": "u_arav", "title": "Mentor feedback received",
         "body": "Dr. Kavya Menon left feedback on your sprint work.",
         "link": "/dashboard/student?tab=internship", "kind": "feedback", "read": False,
         "createdAt": "2026-09-16T15:30:00"},
        {"userId": "u_arav", "title": "Deadline approaching",
         "body": "Export-to-CSV test coverage is due tomorrow.",
         "link": "/dashboard/student?tab=internship", "kind": "warning", "read": False,
         "createdAt": "2026-09-17T09:00:00"},
        {"userId": "u_arav", "title": "Certificate generated",
         "body": "Your PixelKraft Studio certificate is ready to download.",
         "link": "/dashboard/student?tab=certificate", "kind": "success", "read": True,
         "createdAt": "2026-07-02T10:30:00"},
        {"userId": "u_kavya", "title": "Daily update submitted",
         "body": "Aarav Sharma submitted the Sep 17 update.",
         "link": "/dashboard/mentor?tab=reviews", "kind": "update", "read": False,
         "createdAt": "2026-09-17T18:05:00"},
        {"userId": "u_kavya", "title": "Task needs review",
         "body": "Aarav submitted “Dashboard empty states” for review.",
         "link": "/dashboard/mentor?tab=reviews", "kind": "task", "read": False,
         "createdAt": "2026-09-16T18:10:00"},
        {"userId": "u_kavya", "title": "Attendance alert",
         "body": "Arjun Kumar missed 4 of the last 10 working days.",
         "link": "/dashboard/mentor?tab=interns", "kind": "warning", "read": False,
         "createdAt": "2026-09-17T09:30:00"},
        {"userId": "u_kavya", "title": "Milestone approaching",
         "body": "“CI Foundations” for Arjun Kumar is due Sep 30.",
         "link": "/dashboard/mentor?tab=interns", "kind": "info", "read": True,
         "createdAt": "2026-09-12T09:00:00"},
        {"userId": "u_technova", "title": "New application received",
         "body": "Diya Patel applied for Frontend Developer Intern.",
         "link": "/dashboard/company?tab=applications", "kind": "application", "read": False,
         "createdAt": "2026-09-15T10:00:00"},
        {"userId": "u_technova", "title": "Milestone completed",
         "body": "Aarav Sharma completed “Core Feature Sprint”.",
         "link": "/dashboard/company?tab=monitoring", "kind": "success", "read": False,
         "createdAt": "2026-08-29T17:00:00"},
        {"userId": "u_technova", "title": "Progress update",
         "body": "Arjun Kumar’s internship progress dropped to 28%.",
         "link": "/dashboard/company?tab=monitoring", "kind": "warning", "read": True,
         "createdAt": "2026-09-10T09:00:00"},
        {"userId": "u_admin", "title": "New company registration",
         "body": "PixelKraft Studio joined the platform.",
         "link": "/dashboard/admin?tab=companies", "kind": "application", "read": False,
         "createdAt": "2026-09-14T12:00:00"},
        {"userId": "u_admin", "title": "Platform activity",
         "body": "12 applications were submitted this week.",
         "link": "/dashboard/admin?tab=activity", "kind": "info", "read": False,
         "createdAt": "2026-09-17T08:00:00"},
    ]:
        C("notifications").insert_one({"_id": nid("n_"), **n})

    C("threads").insert_one(
        {"_id": "t_kavya_arav", "participants": ["u_arav", "u_kavya"],
         "subject": "Sprint guidance", "updatedAt": "2026-09-17T10:00:00",
         "messages": [
             {"fromId": "u_arav", "text": "Morning! For the notifications centre, should read-state be optimistic or server-confirmed?", "at": "2026-09-17T09:40:00"},
             {"fromId": "u_kavya", "text": "Optimistic with rollback on failure — it keeps the UI feeling instant. Just make sure the error path is tested.", "at": "2026-09-17T09:52:00"},
             {"fromId": "u_arav", "text": "Got it, will do that. Also flagged a 500 on mark-all-read to the backend channel.", "at": "2026-09-17T09:55:00"},
             {"fromId": "u_kavya", "text": "Perfect — exactly the right instinct. Keep me posted.", "at": "2026-09-17T10:00:00"}]})
    C("threads").insert_one(
        {"_id": "t_tn_arav", "participants": ["u_arav", "u_technova"],
         "subject": "Onboarding", "updatedAt": "2026-07-01T11:00:00",
         "messages": [
             {"fromId": "u_technova", "text": "Welcome aboard, Aarav! Your mentor Dr. Kavya Menon will reach out today.", "at": "2026-07-01T09:00:00"},
             {"fromId": "u_arav", "text": "Thank you! Excited to get started.", "at": "2026-07-01T09:20:00"}]})
    print("[internova] seed complete", flush=True)
