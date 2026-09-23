from __future__ import annotations
import os
from contextlib import asynccontextmanager
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import auth as A
from . import emailer as E
from .parse import parse_resume
from .store import nid, now_iso, seed_if_empty, store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_if_empty()
    yield


app = FastAPI(title="InterNova API", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
api = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


                                                                            
def pub(u: dict | None) -> dict | None:
    if not u:
        return None
    u = dict(u)
    u.pop("passwordHash", None)
    return u


def me(req: Request, roles: list[str] | None = None) -> dict:
    h = req.headers.get("authorization", "")
    if not h.lower().startswith("bearer ") or len(h) < 10:
        raise HTTPException(401, "Missing or invalid authorization token")
    try:
        payload = A.decode_token(h.split(" ", 1)[1].strip())
    except Exception:
        raise HTTPException(401, "Session expired — please sign in again")
    u = store.col("users").find_one({"_id": payload.get("sub")})
    if not u:
        raise HTTPException(401, "Account not found")
    if roles and u.get("role") not in roles:
        raise HTTPException(403, "You do not have access to this resource")
    return u


def notify(user_id: str, title: str, body: str, link: str = "", kind: str = "info"):
    if not user_id:
        return
    store.col("notifications").insert_one(
        {"_id": nid("n_"), "userId": user_id, "title": title, "body": body,
         "link": link, "kind": kind, "read": False, "createdAt": now_iso()})


                                                                           
ws_clients: dict[str, set] = {}

async def _ws_send(uid: str, payload: dict):
    for ws in list(ws_clients.get(uid, set())):
        try:
            await ws.send_json(payload)
        except Exception:
            pass

async def _ws_broadcast(payload: dict):
    for uid in list(ws_clients.keys()):
        await _ws_send(uid, payload)

def _online_ids() -> list[str]:
    return sorted(ws_clients.keys())

def _thread_mates(tid: str, me_id: str) -> list[str]:
    t = store.col("threads").find_one({"_id": tid}) or {}
    return [p for p in t.get("participants", []) if p != me_id]

def _norm_skills(xs) -> set[str]:
    return {str(x).strip().lower() for x in (xs or []) if str(x).strip()}

def _score_internship_for_student(it: dict, stu: dict, past_apps: list[dict]) -> tuple[int, list[str]]:
    mine = _norm_skills(stu.get("skills"))
    need = _norm_skills(it.get("skills"))
    reasons: list[str] = []
    score = 0
    if need:
        hit = mine & need
        score += round(len(hit) / len(need) * 60)
        if hit:
            reasons.append(f"Matches {len(hit)}/{len(need)} skills ({', '.join(sorted(hit)[:4])})")
    else:
        score += 30
    modes = [(a.get("internship") or {}).get("mode", "") for a in past_apps]
    modes = [m for m in modes if m]
    pref = max(set(modes), key=modes.count) if modes else "Remote"
    if (it.get("mode") or "") == pref:
        score += 15
        reasons.append(f"{pref} mode — your usual pick" if modes else "Remote-friendly")
    if stu.get("location") and it.get("location") and stu["location"].lower() in it["location"].lower():
        score += 10
        reasons.append("In your city")
    domains = [(a.get("internship") or {}).get("domain", "") for a in past_apps]
    if it.get("domain") and it["domain"] in domains:
        score += 10
        reasons.append(f"More {it['domain']} roles")
    if stu.get("profileComplete"):
        score += 5
    else:
        reasons.append("Complete your profile to boost matches")
    try:
        dl = (it.get("deadline") or "")[:10]
        if dl:
            days = (date.fromisoformat(dl) - date.today()).days
            if 0 <= days <= 14:
                score += 5
                reasons.append(f"Closing in {days}d — apply soon")
    except Exception:
        pass
    return max(0, min(100, score)), reasons

def _score_applicant(a: dict, it: dict) -> tuple[int, list[str]]:
    st = a.get("student") or {}
    mine = _norm_skills(st.get("skills"))
    need = _norm_skills(it.get("skills"))
    score, reasons = 0, []
    if need:
        hit = mine & need
        score += round(len(hit) / len(need) * 50)
        if hit:
            reasons.append(f"{len(hit)}/{len(need)} required skills")
    else:
        score += 25
    if st.get("profileComplete"):
        score += 15
        reasons.append("Complete profile")
    try:
        cg = float(str(st.get("cgpa", "")).strip().split("/")[0])
        score += max(0, min(10, round(cg)))
        if cg >= 8:
            reasons.append(f"CGPA {cg}")
    except Exception:
        pass
    cl = len(a.get("coverLetter", "") or "")
    if cl >= 120:
        score += 10
        reasons.append("Thoughtful cover letter")
    elif cl >= 40:
        score += 5
    try:
        ad, cd = (a.get("appliedAt", "") or "")[:10], (it.get("createdAt", "") or "")[:10]
        if ad and cd and (date.fromisoformat(ad) - date.fromisoformat(cd)).days <= 7:
            score += 5
            reasons.append("Early applicant")
    except Exception:
        pass
    return max(0, min(100, score)), reasons

def _pick_mentor(it: dict):
    mentors = store.col("users").find({"role": "mentor"})
    if not mentors:
        return None
    need = _norm_skills(it.get("skills"))
    best, best_key = None, None
    for m in mentors:
        if m.get("suspended"):
            continue
        overlap = len(_norm_skills(m.get("expertise")) & need)
        load = store.col("allocations").count_documents({"mentorId": m["_id"], "status": "active"})
        cap = int(m.get("maxMentees", 10) or 10)
        key = (overlap, cap - load)
        if best_key is None or key > best_key:
            best, best_key = m, key
    return best


def _alloc_for(u: dict, aid: str):
    al = store.col("allocations").find_one({"_id": aid})
    if not al:
        return None
    r = u.get("role")
    if r == "admin":
        return al
    if r == "student" and al.get("studentId") == u["_id"]:
        return al
    if r == "mentor" and al.get("mentorId") == u["_id"]:
        return al
    if r == "company" and al.get("companyId") == u["_id"]:
        return al
    return None


def _my_allocation_ids(u: dict) -> list[str]:
    q: dict = {}
    if u.get("role") == "student":
        q = {"studentId": u["_id"]}
    elif u.get("role") == "mentor":
        q = {"mentorId": u["_id"]}
    elif u.get("role") == "company":
        q = {"companyId": u["_id"]}
    return [a["_id"] for a in store.col("allocations").find(q)]


def _enrich_session(s: dict) -> dict:
    s = dict(s)
    al = store.col("allocations").find_one({"_id": s.get("allocationId")}) or {}
    st = store.col("users").find_one({"_id": al.get("studentId")}) or {}
    mt = store.col("users").find_one({"_id": al.get("mentorId")}) or {}
    it = store.col("internships").find_one({"_id": al.get("internshipId")}) or {}
    s["student"] = {"_id": st.get("_id", ""), "name": st.get("name", "?"), "email": st.get("email", "")}
    s["mentor"] = {"_id": mt.get("_id", ""), "name": mt.get("name", "Unassigned"), "email": mt.get("email", "")}
    s["internship"] = {"title": it.get("title", ""), "companyName": it.get("companyName", "")}
    return s


def _digest_for(aid: str) -> dict:
    today_s = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    att = [a for a in store.col("attendance").find({"allocationId": aid}) if (a.get("date", "") or "") >= week_ago]
    counted = [a for a in att if a.get("status") in ("present", "absent", "leave")]
    present = [a for a in counted if a.get("status") == "present"]
    att_pct = round(len(present) / len(counted) * 100) if counted else 100
    ups = [x for x in store.col("updates").find({"allocationId": aid}) if (x.get("date", "") or "") >= week_ago]
    hours = round(sum(float(x.get("hours") or 0) for x in ups), 1)
    blockers = [str(x.get("blockers", "")).strip() for x in ups
                if str(x.get("blockers", "")).strip().lower() not in ("", "none", "none.", "n/a", "-")]
    tasks = store.col("tasks").find({"allocationId": aid})
    done_recent = [t for t in tasks if t.get("status") == "completed" and (t.get("dueDate", "") or "") >= week_ago]
    overdue = [t for t in tasks if t.get("status") != "completed" and (t.get("dueDate", "") or "") < today_s]
    ms = store.col("milestones").find({"allocationId": aid})
    ms_done = [m for m in ms if m.get("status") == "completed"]
    sess_done = [x for x in store.col("sessions").find({"allocationId": aid})
                 if x.get("status") == "completed" and (x.get("date", "") or "") >= week_ago]
    risks, highlights = [], []
    if counted and len(counted) >= 3 and att_pct < 75:
        risks.append(f"Attendance slipped to {att_pct}% this week")
    if overdue:
        risks.append(f"{len(overdue)} overdue task{'s' if len(overdue) > 1 else ''}")
    if not ups:
        risks.append("No daily updates logged this week")
    if ups and hours < 10:
        risks.append(f"Only {hours}h logged this week")
    seen: dict[str, int] = {}
    for b in blockers:
        seen[b.lower()[:60]] = seen.get(b.lower()[:60], 0) + 1
    rep = [b for b in blockers if seen[b.lower()[:60]] > 1]
    if rep:
        risks.append(f"Recurring blocker: {rep[0][:80]}")
    if done_recent:
        highlights.append(f"{len(done_recent)} task{'s' if len(done_recent) > 1 else ''} completed")
    if hours >= 20:
        highlights.append(f"{hours}h of focused work")
    if sess_done:
        highlights.append(f"{len(sess_done)} mentoring session{'s' if len(sess_done) > 1 else ''} held")
    if ms_done and ms:
        highlights.append(f"{len(ms_done)}/{len(ms)} milestones done")
    score = 100
    if counted and len(counted) >= 3:
        score -= max(0, 75 - att_pct)
    score -= min(24, len(overdue) * 8)
    if not ups:
        score -= 15
    if ups and hours < 10:
        score -= 10
    if rep:
        score -= 10
    return {"allocationId": aid, "score": max(0, min(100, score)),
            "attendance7": {"pct": att_pct, "present": len(present), "total": len(counted)},
            "hours7": hours, "updates7": len(ups),
            "tasksDone7": len(done_recent), "overdue": len(overdue),
            "milestones": {"done": len(ms_done), "total": len(ms)},
            "sessions7": len(sess_done), "risks": risks, "highlights": highlights}


def allocation_summary(al: dict) -> dict:
    aid = al["_id"]
    att = store.col("attendance").find({"allocationId": aid})
    counted = [a for a in att if a.get("status") in ("present", "absent", "leave")]
    present = [a for a in counted if a.get("status") == "present"]
    pct = round(len(present) / len(counted) * 100) if counted else 0
    tasks = store.col("tasks").find({"allocationId": aid})
    ms = store.col("milestones").find({"allocationId": aid})
    done_tasks = [t for t in tasks if t.get("status") == "completed"]
    done_ms = [m for m in ms if m.get("status") == "completed"]
    progress = 0
    if tasks or ms:
        tp = (len(done_tasks) / len(tasks) * 60) if tasks else 0
        mp = (len(done_ms) / len(ms) * 40) if ms else 0
        progress = round(tp + mp) if (tasks and ms) else round((tp or mp) / (0.6 if tasks and not ms else 0.4 if ms and not tasks else 1))
        progress = max(0, min(100, progress))
    return {"attendancePct": pct, "attendance": {"present": len(present), "total": len(counted)},
            "tasks": {"done": len(done_tasks), "total": len(tasks)},
            "milestones": {"done": len(done_ms), "total": len(ms)},
            "progress": progress or al.get("progress", 0)}


def evaluation_eligibility(al: dict) -> dict:
    s = allocation_summary(al)
    reasons = []
    if s["tasks"]["total"] and s["tasks"]["done"] < s["tasks"]["total"]:
        reasons.append(f"{s['tasks']['total'] - s['tasks']['done']} task(s) still open")
    if s["milestones"]["total"] and s["milestones"]["done"] < s["milestones"]["total"]:
        reasons.append(f"{s['milestones']['total'] - s['milestones']['done']} milestone(s) incomplete")
    if s["attendancePct"] < 75 and s["attendance"]["total"] > 0:
        reasons.append(f"Attendance is {s['attendancePct']}% (minimum 75%)")
    return {"eligible": not reasons, "reasons": reasons, "summary": s}


def enrich_application(a: dict) -> dict:
    a = dict(a)
    a["student"] = pub(store.col("users").find_one({"_id": a.get("studentId")}))
    a["internship"] = store.col("internships").find_one({"_id": a.get("internshipId")})
    return a


def enrich_allocation(al: dict) -> dict:
    al = dict(al)
    al["student"] = pub(store.col("users").find_one({"_id": al.get("studentId")}))
    al["mentor"] = pub(store.col("users").find_one({"_id": al.get("mentorId")}))
    al["internship"] = store.col("internships").find_one({"_id": al.get("internshipId")})
    al["summary"] = allocation_summary(al)
    return al


def _week_buckets(pairs, weeks: int = 8):
    from datetime import datetime
    buckets: dict[tuple, dict] = {}
    for ds, v in pairs:
        try:
            d = datetime.fromisoformat((ds or "")[:10])
        except ValueError:
            continue
        y, w, _ = d.isocalendar()
        b = buckets.setdefault((y, w), {"label": d.strftime("%b %d"), "total": 0, "count": 0})
        try:
            b["total"] += float(v or 0)
        except (TypeError, ValueError):
            pass
        b["count"] += 1
    return [{"week": b["label"], "total": round(b["total"], 1), "count": b["count"]}
            for _, b in sorted(buckets.items())[-weeks:]]


                                                                            
class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str                     


class LoginIn(BaseModel):
    email: str
    password: str


class OtpIn(BaseModel):
    tempToken: str
    otp: str


class GoogleIn(BaseModel):
    credential: str | None = None
    email: str | None = None
    name: str = ""


class ForgotIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    password: str


class InternshipIn(BaseModel):
    title: str
    domain: str = "General"
    skills: list[str] = []
    mode: str = "Remote"
    location: str = "Remote (India)"
    duration: str = "6 months"
    durationMonths: int = 6
    stipend: str = ""
    openings: int = 1
    startDate: str = ""
    deadline: str = ""
    description: str = ""
    responsibilities: list[str] = []


class ApplicationIn(BaseModel):
    internshipId: str
    coverLetter: str = ""


class StatusIn(BaseModel):
    status: str


class AttendanceIn(BaseModel):
    date: str
    status: str
    note: str = ""


class UpdateIn(BaseModel):
    date: str = ""
    workedOn: str = ""
    completed: str = ""
    learned: str = ""
    blockers: str = ""
    hours: float = 0


class ReviewIn(BaseModel):
    reviewStatus: str = "approved"
    mentorComment: str = ""


class TaskIn(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    dueDate: str = ""


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    comment: Optional[str] = None
    commentBy: Optional[str] = None


class MilestoneIn(BaseModel):
    title: str
    description: str = ""
    dueDate: str = ""
    percent: int = 0
    status: str = "upcoming"


class MilestonePatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    percent: Optional[int] = None
    dueDate: Optional[str] = None


class FeedbackIn(BaseModel):
    category: str = "General"
    rating: int = 5
    message: str = ""


class EvalIn(BaseModel):
    technical: int = 0
    communication: int = 0
    professionalism: int = 0
    problemSolving: int = 0
    overall: float = 0
    comments: str = ""


class MentorIn(BaseModel):
    name: str
    email: str
    expertise: list[str] = []
    organisation: str = "InterNova Mentor Network"


class UserPatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    year: Optional[str] = None
    cgpa: Optional[str] = None
    profileComplete: Optional[bool] = None
    company: Optional[dict] = None


class MessageIn(BaseModel):
    text: str


                                                                           
@api.get("/health")
def health():
    return {"ok": True, "service": "internova-api", "db": store.mode, "time": now_iso()}


                                                                         
@api.post("/auth/register")
def register(body: RegisterIn):
    role = body.role.strip().lower()
    if role not in ("student", "company"):
        raise HTTPException(400, "Public registration is open for Student and Company roles only")
    email = body.email.strip().lower()
    if store.col("users").find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    uid = nid("u_")
    user = {"_id": uid, "name": body.name.strip(), "email": email,
            "passwordHash": A.hash_password(body.password), "role": role,
            "avatar": "".join(p[0] for p in body.name.strip().split()[:2]).upper() or "IN",
            "color": "#7b39fc", "profileComplete": False,
            "skills": [] if role == "student" else None,
            "company": {"name": "", "industry": "", "size": "", "location": "",
                        "website": "", "about": ""} if role == "company" else None,
            "createdAt": now_iso()}
    store.col("users").insert_one(user)
    for admin in store.col("users").find({"role": "admin"}):
        notify(admin["_id"], "New user registration",
               f"{user['name']} joined as {role}.", "/dashboard/admin?tab=activity")
    E.send_template(email, E.welcome(user["name"], role), "welcome", uid)
    return {"token": A.make_token(uid, role), "user": pub(user)}


@api.post("/auth/login")
def login(body: LoginIn):
    u = store.col("users").find_one({"email": body.email.strip().lower()})
    if not u or not A.verify_password(body.password, u.get("passwordHash", "")):
        raise HTTPException(401, "Invalid email or password")
    tmp, otp = A.issue_otp(u["_id"])
    E.send_template(u["email"], E.otp(u["name"], otp), "otp", u["_id"])
    return {"otpRequired": True, "tempToken": tmp,
            "email": u["email"], **({"devOtp": otp} if A.DEV_OTP else {})}


@api.post("/auth/verify-otp")
def verify_otp(body: OtpIn):
    uid = A.check_otp(body.tempToken, body.otp)
    if not uid:
        raise HTTPException(401, "Invalid or expired OTP")
    u = store.col("users").find_one({"_id": uid})
    return {"token": A.make_token(uid, u["role"]), "user": pub(u)}


@api.post("/auth/google")
def google(body: GoogleIn):
    if body.credential:
        try:
            idinfo = A.verify_google_credential(body.credential)
        except ValueError as e:
            raise HTTPException(401, str(e))
        email = idinfo["email"].strip().lower()
        name = idinfo.get("name") or email.split("@")[0]
    elif body.email and not A.GOOGLE_CLIENT_ID:
        email = body.email.strip().lower()
        name = (body.name or "").strip()
    elif body.email:
        raise HTTPException(400, "Google sign-in is configured for real ID tokens; pass credential, not email")
    else:
        raise HTTPException(400, "Missing Google credential")
    u = store.col("users").find_one({"email": email})
    if not u:
        uid = nid("u_")
        u = {"_id": uid, "name": name or email.split("@")[0],
             "email": email, "passwordHash": "", "role": "student",
             "avatar": (name[:1] or "G").upper(), "color": "#7b39fc",
             "profileComplete": False, "skills": [], "createdAt": now_iso()}
        store.col("users").insert_one(u)
        E.send_template(email, E.welcome(u["name"], "student"), "welcome", uid)
    return {"token": A.make_token(u["_id"], u["role"]), "user": pub(u)}


@api.post("/auth/forgot-password")
def forgot(body: ForgotIn):
    u = store.col("users").find_one({"email": body.email.strip().lower()})
                                                           
    if u:
        tok = A.issue_reset(u["_id"])
        E.send_template(u["email"], E.reset(u["name"], tok), "reset", u["_id"])
        if A.DEV_OTP:
            return {"message": "Reset link generated (demo mode).", "devResetToken": tok}
    return {"message": "If an account exists for this email, a reset link has been sent."}


@api.post("/auth/reset-password")
def reset(body: ResetIn):
    uid = A.check_reset(body.token)
    if not uid:
        raise HTTPException(400, "This reset link is invalid or has expired")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    store.col("users").update_one({"_id": uid},
                                  {"$set": {"passwordHash": A.hash_password(body.password)}})
    return {"message": "Password updated. You can now sign in."}


@api.get("/auth/me")
def auth_me(req: Request):
    return pub(me(req))


                                                                            
@api.get("/internships")
def list_internships(q: str = "", domain: str = "", mode: str = "",
                     location: str = "", company: str = ""):
    rows = store.col("internships").find()
    ql = q.lower()
    out = []
    for it in rows:
        if it.get("status") == "closed":
            continue
        blob = f"{it.get('title','')} {it.get('companyName','')} {it.get('domain','')} {' '.join(it.get('skills',[]))}".lower()
        if ql and ql not in blob:
            continue
        if domain and it.get("domain") != domain:
            continue
        if mode and it.get("mode") != mode:
            continue
        if location and location.lower() not in it.get("location", "").lower():
            continue
        if company and company.lower() not in it.get("companyName", "").lower():
            continue
        it = dict(it)
        it["applicants"] = store.col("applications").count_documents({"internshipId": it["_id"]})
        out.append(it)
    out.sort(key=lambda r: r.get("postedAt", ""), reverse=True)
    return out


@api.get("/internships/{iid}")
def get_internship(iid: str):
    it = store.col("internships").find_one({"_id": iid})
    if not it:
        raise HTTPException(404, "Internship not found")
    it = dict(it)
    it["applicants"] = store.col("applications").count_documents({"internshipId": iid})
    return it


@api.post("/internships")
def create_internship(body: InternshipIn, req: Request):
    u = me(req, ["company", "admin"])
    co = (u.get("company") or {}).get("name") or u.get("name")
    doc = body.model_dump()
    doc.update({"_id": nid("int_"), "companyId": u["_id"], "companyName": co,
                "status": "open", "postedAt": date.today().isoformat(),
                "createdAt": now_iso()})
    store.col("internships").insert_one(doc)
    for admin in store.col("users").find({"role": "admin"}):
        notify(admin["_id"], "New internship posted",
               f"{co} posted “{doc['title']}”.", "/dashboard/admin?tab=internships")
    return doc


@api.patch("/internships/{iid}")
def update_internship(iid: str, patch: dict, req: Request):
    u = me(req, ["company", "admin"])
    it = store.col("internships").find_one({"_id": iid})
    if not it:
        raise HTTPException(404, "Internship not found")
    if u["role"] == "company" and it.get("companyId") != u["_id"]:
        raise HTTPException(403, "Not your internship")
    allowed = {"title", "domain", "skills", "mode", "location", "duration",
               "durationMonths", "stipend", "openings", "startDate", "deadline",
               "description", "responsibilities", "status"}
    store.col("internships").update_one({"_id": iid},
                                        {"$set": {k: v for k, v in patch.items() if k in allowed}})
    return store.col("internships").find_one({"_id": iid})


                                                                            
@api.post("/applications")
def apply(body: ApplicationIn, req: Request):
    u = me(req, ["student"])
    it = store.col("internships").find_one({"_id": body.internshipId})
    if not it or it.get("status") == "closed":
        raise HTTPException(400, "This internship is no longer accepting applications")
    if store.col("applications").find_one({"studentId": u["_id"], "internshipId": body.internshipId}):
        raise HTTPException(409, "You have already applied to this internship")
    doc = {"_id": nid("ap_"), "studentId": u["_id"], "internshipId": body.internshipId,
           "status": "applied", "coverLetter": body.coverLetter,
           "appliedAt": now_iso(), "updatedAt": now_iso(),
           "timeline": [{"s": "applied", "at": date.today().isoformat()}]}
    store.col("applications").insert_one(doc)
    co = store.col("users").find_one({"_id": it.get("companyId")})
    if co:
        notify(co["_id"], "New application received",
               f"{u['name']} applied for {it['title']}.",
               "/dashboard/company?tab=applications", "application")
    return enrich_application(doc)


@api.get("/applications")
def list_applications(req: Request, studentId: str = "", internshipId: str = "",
                      companyId: str = "", status: str = ""):
    u = me(req)
    q: dict = {}
    if u["role"] == "student":
        q["studentId"] = u["_id"]
    elif studentId:
        q["studentId"] = studentId
    if internshipId:
        q["internshipId"] = internshipId
    if status:
        q["status"] = status
    rows = store.col("applications").find(q, sort=[("appliedAt", -1)])
    out = [enrich_application(a) for a in rows]
    if companyId or u["role"] == "company":
        cid = companyId or u["_id"]
        out = [a for a in out if (a.get("internship") or {}).get("companyId") == cid]
    return out


@api.patch("/applications/{aid}")
def update_application(aid: str, body: StatusIn, req: Request):
    u = me(req, ["company", "admin"])
    a = store.col("applications").find_one({"_id": aid})
    if not a:
        raise HTTPException(404, "Application not found")
    it = store.col("internships").find_one({"_id": a["internshipId"]})
    if u["role"] == "company" and (it or {}).get("companyId") != u["_id"]:
        raise HTTPException(403, "Not your application")
    status = body.status.strip().lower()
    if status not in ("applied", "under_review", "shortlisted", "selected", "rejected", "allocated"):
        raise HTTPException(400, "Invalid status")
    timeline = a.get("timeline", []) + [{"s": status, "at": date.today().isoformat()}]
    store.col("applications").update_one({"_id": aid}, {"$set": {"status": status, "timeline": timeline, "updatedAt": now_iso()}})
    labels = {"under_review": "under review", "shortlisted": "shortlisted",
              "selected": "selected", "rejected": "rejected", "allocated": "allocated"}
    notify(a["studentId"], f"Application {labels.get(status, status)}",
           f"Your application for {(it or {}).get('title','the internship')} is now {labels.get(status, status)}.",
           "/dashboard/student?tab=applications",
           "success" if status in ("shortlisted", "selected", "allocated") else "info")
    st = store.col("users").find_one({"_id": a["studentId"]}) or {}
    if st.get("email"):
        E.send_template(st["email"], E.app_status(st.get("name", "there"),
                        (it or {}).get("title", "your internship"), status),
                        "app_status", a["studentId"])
    allocation = None
    if status == "selected":
                                                                    
        mentor = store.col("users").find_one({"role": "mentor"})
        allocation = {"_id": nid("al_"), "studentId": a["studentId"],
                      "internshipId": a["internshipId"], "companyId": (it or {}).get("companyId"),
                      "mentorId": mentor["_id"] if mentor else "", "status": "allocated",
                      "startDate": (it or {}).get("startDate", ""), "endDate": "",
                      "progress": 0, "createdAt": now_iso(), "updatedAt": now_iso()}
        store.col("allocations").insert_one(allocation)
        store.col("applications").update_one({"_id": aid}, {"$set": {"status": "allocated"}})
        notify(a["studentId"], "Mentor assigned",
               f"{(mentor or {}).get('name','A mentor')} will guide your internship.",
               "/dashboard/student?tab=internship")
        if mentor:
            notify(mentor["_id"], "New intern assigned",
                   f"{(pub(store.col('users').find_one({'_id': a['studentId']})) or {}).get('name','A student')} was allocated to {(it or {}).get('title','an internship')}.",
                   "/dashboard/mentor?tab=interns")
    out = enrich_application(store.col("applications").find_one({"_id": aid}))
    out["allocation"] = allocation
    return out


                                                                           
@api.get("/allocations")
def list_allocations(req: Request, studentId: str = "", mentorId: str = "", companyId: str = ""):
    u = me(req)
    q: dict = {}
    if u["role"] == "student":
        q["studentId"] = u["_id"]
    elif u["role"] == "mentor":
        q["mentorId"] = u["_id"]
    elif u["role"] == "company":
        q["companyId"] = u["_id"]
    if studentId:
        q["studentId"] = studentId
    if mentorId:
        q["mentorId"] = mentorId
    if companyId:
        q["companyId"] = companyId
    return [enrich_allocation(a) for a in store.col("allocations").find(q)]


@api.get("/allocations/{aid}")
def get_allocation(aid: str, req: Request):
    me(req)
    al = store.col("allocations").find_one({"_id": aid})
    if not al:
        raise HTTPException(404, "Allocation not found")
    out = enrich_allocation(al)
    out["attendance"] = store.col("attendance").find({"allocationId": aid}, sort=[("date", 1)])
    out["updates"] = store.col("updates").find({"allocationId": aid}, sort=[("date", -1)])
    out["tasks"] = store.col("tasks").find({"allocationId": aid})
    out["milestones"] = store.col("milestones").find({"allocationId": aid}, sort=[("dueDate", 1)])
    out["feedback"] = store.col("feedback").find({"allocationId": aid}, sort=[("createdAt", -1)])
    out["evaluation"] = store.col("evaluations").find_one({"allocationId": aid})
    out["eligibility"] = evaluation_eligibility(al)
    return out


@api.post("/allocations/{aid}/complete")
def complete_allocation(aid: str, req: Request):
    u = me(req, ["company", "admin"])
    al = store.col("allocations").find_one({"_id": aid})
    if not al:
        raise HTTPException(404, "Allocation not found")
    elig = evaluation_eligibility(al)
    if not elig["eligible"]:
        raise HTTPException(400, "Completion criteria not met: " + "; ".join(elig["reasons"]))
    if not store.col("evaluations").find_one({"allocationId": aid}):
        raise HTTPException(400, "Final evaluation must be submitted before completion")
    import random as _r
    code = f"INT-{date.today().year}-{_r.randint(100000, 999999)}"
    it = store.col("internships").find_one({"_id": al["internshipId"]}) or {}
    st = store.col("users").find_one({"_id": al["studentId"]}) or {}
    cert = {"_id": code, "studentId": al["studentId"], "studentName": st.get("name", ""),
            "companyName": it.get("companyName", ""), "role": it.get("title", ""),
            "duration": f"{al.get('startDate','')} – {date.today().isoformat()}",
            "completionDate": date.today().isoformat(), "status": "valid",
            "grade": "A", "skills": it.get("skills", []),
            "issuedAt": now_iso(), "createdAt": now_iso()}
    store.col("certificates").insert_one(cert)
    store.col("allocations").update_one({"_id": aid}, {"$set": {"status": "completed", "progress": 100, "updatedAt": now_iso()}})
    notify(al["studentId"], "Certificate generated",
           f"Your certificate {code} is ready to download.",
           "/dashboard/student?tab=certificate", "success")
    if st.get("email"):
        E.send_template(st["email"], E.certificate(st.get("name", "there"), code,
                        it.get("title", ""), it.get("companyName", "")),
                        "certificate", al["studentId"])
    return {"certificate": cert}


                                                                        
@api.get("/allocations/{aid}/attendance")
def get_attendance(aid: str, req: Request):
    me(req)
    return store.col("attendance").find({"allocationId": aid}, sort=[("date", 1)])


@api.post("/allocations/{aid}/attendance")
def mark_attendance(aid: str, body: AttendanceIn, req: Request):
    me(req, ["student"])
    if body.status not in ("present", "absent", "leave", "holiday"):
        raise HTTPException(400, "Invalid status")
    ex = store.col("attendance").find_one({"allocationId": aid, "date": body.date})
    if ex:
        store.col("attendance").update_one({"_id": ex["_id"]}, {"$set": {"status": body.status, "note": body.note}})
        return store.col("attendance").find_one({"_id": ex["_id"]})
    doc = {"_id": nid("at_"), "allocationId": aid, **body.model_dump(), "createdAt": now_iso()}
    store.col("attendance").insert_one(doc)
    return doc


@api.get("/allocations/{aid}/updates")
def get_updates(aid: str, req: Request):
    me(req)
    return store.col("updates").find({"allocationId": aid}, sort=[("date", -1)])


@api.post("/allocations/{aid}/updates")
def post_update(aid: str, body: UpdateIn, req: Request):
    u = me(req, ["student"])
    doc = {"_id": nid("up_"), "allocationId": aid, **body.model_dump(),
           "date": body.date or date.today().isoformat(),
           "reviewStatus": "pending", "mentorComment": "", "createdAt": now_iso()}
    store.col("updates").insert_one(doc)
    al = store.col("allocations").find_one({"_id": aid})
    if al and al.get("mentorId"):
        notify(al["mentorId"], "Daily update submitted",
               f"{u['name']} submitted the {doc['date']} update.",
               "/dashboard/mentor?tab=reviews", "update")
    return doc


@api.patch("/updates/{uid}")
def review_update(uid: str, body: ReviewIn, req: Request):
    u = me(req, ["mentor", "admin"])
    up = store.col("updates").find_one({"_id": uid})
    if not up:
        raise HTTPException(404, "Update not found")
    store.col("updates").update_one({"_id": uid}, {"$set": {"reviewStatus": body.reviewStatus, "mentorComment": body.mentorComment}})
    al = store.col("allocations").find_one({"_id": up["allocationId"]})
    if al:
        notify(al["studentId"], "Daily update reviewed",
               f"{u['name']} reviewed your {up['date']} update.",
               "/dashboard/student?tab=internship", "feedback")
    return store.col("updates").find_one({"_id": uid})


                                                                          
@api.get("/allocations/{aid}/tasks")
def get_tasks(aid: str, req: Request):
    me(req)
    return store.col("tasks").find({"allocationId": aid})


@api.post("/allocations/{aid}/tasks")
def create_task(aid: str, body: TaskIn, req: Request):
    u = me(req)
    doc = {"_id": nid("t_"), "allocationId": aid, **body.model_dump(),
           "comments": [], "createdAt": now_iso()}
    store.col("tasks").insert_one(doc)
    if u["role"] == "mentor":
        al = store.col("allocations").find_one({"_id": aid})
        if al:
            notify(al["studentId"], "New task assigned",
                   f"{body.title} — due {body.dueDate or 'unscheduled'}.",
                   "/dashboard/student?tab=internship", "task")
            st = store.col("users").find_one({"_id": al["studentId"]}) or {}
            if st.get("email"):
                E.send_template(st["email"], E.task_assigned(st.get("name", "there"),
                                body.title, body.dueDate), "task", al["studentId"])
    return doc


@api.patch("/tasks/{tid}")
def patch_task(tid: str, body: TaskPatch, req: Request):
    u = me(req)
    t = store.col("tasks").find_one({"_id": tid})
    if not t:
        raise HTTPException(404, "Task not found")
    patch = {k: v for k, v in body.model_dump().items()
             if v is not None and k not in ("comment", "commentBy")}
    if patch:
        store.col("tasks").update_one({"_id": tid}, {"$set": patch})
        t.update(patch)
    if body.comment:
        comments = t.get("comments", []) + [{"by": body.commentBy or u["name"],
                                             "text": body.comment, "at": now_iso()}]
        store.col("tasks").update_one({"_id": tid}, {"$set": {"comments": comments}})
    if patch.get("status") == "review":
        al = store.col("allocations").find_one({"_id": t["allocationId"]})
        if al and al.get("mentorId"):
            notify(al["mentorId"], "Task needs review",
                   f"{u['name']} submitted “{t['title']}” for review.",
                   "/dashboard/mentor?tab=reviews", "task")
    return store.col("tasks").find_one({"_id": tid})


                                                                           
@api.get("/allocations/{aid}/milestones")
def get_milestones(aid: str, req: Request):
    me(req)
    return store.col("milestones").find({"allocationId": aid}, sort=[("dueDate", 1)])


@api.post("/allocations/{aid}/milestones")
def create_milestone(aid: str, body: MilestoneIn, req: Request):
    me(req, ["mentor", "admin", "company"])
    doc = {"_id": nid("m_"), "allocationId": aid, **body.model_dump(),
           "tasks": [], "createdAt": now_iso()}
    store.col("milestones").insert_one(doc)
    return doc


@api.patch("/milestones/{mid}")
def patch_milestone(mid: str, body: MilestonePatch, req: Request):
    me(req, ["mentor", "admin", "company", "student"])
    m = store.col("milestones").find_one({"_id": mid})
    if not m:
        raise HTTPException(404, "Milestone not found")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if patch:
        store.col("milestones").update_one({"_id": mid}, {"$set": patch})
    return store.col("milestones").find_one({"_id": mid})


                                                                           
@api.get("/allocations/{aid}/feedback")
def get_feedback(aid: str, req: Request):
    me(req)
    return store.col("feedback").find({"allocationId": aid}, sort=[("createdAt", -1)])


@api.post("/allocations/{aid}/feedback")
def give_feedback(aid: str, body: FeedbackIn, req: Request):
    u = me(req, ["mentor", "admin"])
    doc = {"_id": nid("f_"), "allocationId": aid, "fromId": u["_id"],
           "fromName": u["name"], **body.model_dump(), "createdAt": now_iso()}
    store.col("feedback").insert_one(doc)
    al = store.col("allocations").find_one({"_id": aid})
    if al:
        notify(al["studentId"], "Mentor feedback received",
               f"{u['name']} left feedback on your work.",
               "/dashboard/student?tab=internship", "feedback")
        st = store.col("users").find_one({"_id": al["studentId"]}) or {}
        if st.get("email"):
            E.send_template(st["email"], E.feedback_received(st.get("name", "there"),
                            u["name"], body.message), "feedback", al["studentId"])
    return doc


@api.get("/allocations/{aid}/evaluation")
def get_evaluation(aid: str, req: Request):
    me(req)
    al = store.col("allocations").find_one({"_id": aid})
    return {"evaluation": store.col("evaluations").find_one({"allocationId": aid}),
            "eligibility": evaluation_eligibility(al) if al else None}


@api.post("/allocations/{aid}/evaluation")
def submit_evaluation(aid: str, body: EvalIn, req: Request):
    u = me(req, ["company", "admin"])
    al = store.col("allocations").find_one({"_id": aid})
    if not al:
        raise HTTPException(404, "Allocation not found")
    elig = evaluation_eligibility(al)
    if not elig["eligible"]:
        raise HTTPException(400, "Completion criteria not met: " + "; ".join(elig["reasons"]))
    doc = {"_id": nid("ev_"), "allocationId": aid,
           "evaluatorName": (u.get("company") or {}).get("name") or u["name"],
           **body.model_dump(), "createdAt": now_iso()}
    store.col("evaluations").insert_one(doc)
    notify(al["studentId"], "Final evaluation submitted",
           "Your company submitted the final evaluation.",
           "/dashboard/student?tab=internship", "success")
    return doc


                                                                            
@api.get("/certificates/verify/{code}")
def verify_certificate(code: str):
    c = store.col("certificates").find_one({"_id": code.strip()})
    if not c or c.get("status") != "valid":
        raise HTTPException(404, "Certificate not found")
    return {"certificateId": c["_id"], "studentName": c.get("studentName"),
            "company": c.get("companyName"), "role": c.get("role"),
            "duration": c.get("duration"), "completionDate": c.get("completionDate"),
            "grade": c.get("grade"), "skills": c.get("skills", []),
            "status": "VERIFIED", "issuedAt": c.get("issuedAt")}


@api.get("/certificates")
def list_certificates(req: Request, studentId: str = ""):
    u = me(req)
    q: dict = {}
    if u["role"] == "student":
        q["studentId"] = u["_id"]
    elif studentId:
        q["studentId"] = studentId
    return store.col("certificates").find(q, sort=[("issuedAt", -1)])


@api.post("/certificates/{code}/revoke")
def revoke_certificate(code: str, req: Request):
    me(req, ["admin"])
    store.col("certificates").update_one({"_id": code}, {"$set": {"status": "revoked"}})
    return {"message": f"{code} revoked"}


@api.post("/certificates/{code}/reissue")
def reissue_certificate(code: str, req: Request):
    me(req, ["admin"])
    store.col("certificates").update_one({"_id": code}, {"$set": {"status": "valid", "issuedAt": now_iso()}})
    return {"message": f"{code} re-issued"}


                                                                          
@api.get("/users")
def list_users(req: Request, role: str = "", q: str = ""):
    me(req)
    rows = store.col("users").find({"role": role} if role else {})
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in r.get("name", "").lower() or ql in r.get("email", "").lower()]
    return [pub(r) for r in rows]


@api.get("/users/{uid}")
def get_user(uid: str, req: Request):
    me(req)
    u = store.col("users").find_one({"_id": uid})
    if not u:
        raise HTTPException(404, "User not found")
    return pub(u)


@api.patch("/users/{uid}")
def patch_user(uid: str, body: UserPatch, req: Request):
    u = me(req)
    if u["role"] != "admin" and u["_id"] != uid:
        raise HTTPException(403, "You can only edit your own profile")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if patch:
        store.col("users").update_one({"_id": uid}, {"$set": patch})
    return pub(store.col("users").find_one({"_id": uid}))


@api.post("/users/mentor")
def create_mentor(body: MentorIn, req: Request):
    me(req, ["admin"])
    email = body.email.strip().lower()
    if store.col("users").find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    import secrets as _s
    temp = _s.token_urlsafe(6)
    doc = {"_id": nid("u_"), "name": body.name.strip(), "email": email,
           "passwordHash": A.hash_password(temp), "role": "mentor",
           "expertise": body.expertise, "organisation": body.organisation,
           "avatar": "".join(p[0] for p in body.name.strip().split()[:2]).upper(),
           "color": "#ec4899", "createdAt": now_iso()}
    store.col("users").insert_one(doc)
    return {"user": pub(doc), "tempPassword": temp}


                                                                            
@api.get("/notifications")
def get_notifications(req: Request):
    u = me(req)
    rows = store.col("notifications").find({"userId": u["_id"]}, sort=[("createdAt", -1)], limit=60)
    return {"items": rows, "unread": sum(1 for r in rows if not r.get("read"))}


@api.post("/notifications/{nid}/read")
def read_notification(nid: str, req: Request):
    me(req)
    store.col("notifications").update_one({"_id": nid}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
def read_all(req: Request):
    u = me(req)
    for n in store.col("notifications").find({"userId": u["_id"]}):
        store.col("notifications").update_one({"_id": n["_id"]}, {"$set": {"read": True}})
    return {"ok": True}


                                                                           
@api.get("/messages/threads")
def threads(req: Request):
    u = me(req)
    out = []
    for t in store.col("threads").find():
        if u["_id"] not in t.get("participants", []):
            continue
        t = dict(t)
        others = [p for p in t["participants"] if p != u["_id"]]
        other = pub(store.col("users").find_one({"_id": others[0]})) if others else None
        t["other"] = {"name": (other or {}).get("name", "Unknown"),
                      "avatar": (other or {}).get("avatar", "?"),
                      "color": (other or {}).get("color", "#7b39fc"),
                      "role": (other or {}).get("role", "")}
        out.append(t)
    out.sort(key=lambda t: t.get("updatedAt", ""), reverse=True)
    return out


@api.post("/messages/{tid}")
async def send_message(tid: str, body: MessageIn, req: Request):
    u = me(req)
    t = store.col("threads").find_one({"_id": tid})
    if not t or u["_id"] not in t.get("participants", []):
        raise HTTPException(404, "Conversation not found")
    msgs = t.get("messages", []) + [{"fromId": u["_id"], "text": body.text, "at": now_iso()}]
    store.col("threads").update_one({"_id": tid}, {"$set": {"messages": msgs, "updatedAt": now_iso()}})
    for p in t["participants"]:
        if p != u["_id"]:
            notify(p, "New message", f"{u['name']}: {body.text[:80]}",
                   f"/dashboard/{'student' if u['role']=='mentor' else u['role']}?tab=messages", "message")
    for p in t["participants"]:
        if p != u["_id"]:
            await _ws_send(p, {"t": "message", "threadId": tid, "message": msgs[-1], "fromName": u["name"]})
    return {"ok": True, "message": msgs[-1]}


                                                                          
@api.get("/dashboard/overview")
def overview(req: Request):
    u = me(req)
    role = u["role"]
    notifs = store.col("notifications").find({"userId": u["_id"]}, sort=[("createdAt", -1)], limit=6)

    if role == "student":
        als = [enrich_allocation(a) for a in store.col("allocations").find({"studentId": u["_id"]})]
        active = next((a for a in als if a.get("status") == "active"), als[0] if als else None)
        apps = [enrich_application(a) for a in store.col("applications").find({"studentId": u["_id"]})]
        certs = store.col("certificates").find({"studentId": u["_id"]})
        deadlines, activity = [], []
        if active:
            for t in store.col("tasks").find({"allocationId": active["_id"]}):
                if t.get("status") != "completed" and t.get("dueDate"):
                    deadlines.append({"kind": "task", "title": t["title"], "due": t["dueDate"]})
                activity.append({"kind": "task", "text": f"Task “{t['title']}” → {t['status']}", "at": t.get("createdAt", "")})
            for m in store.col("milestones").find({"allocationId": active["_id"]}):
                if m.get("status") != "completed":
                    deadlines.append({"kind": "milestone", "title": m["title"], "due": m.get("dueDate", "")})
            for up in store.col("updates").find({"allocationId": active["_id"]}, limit=4):
                activity.append({"kind": "update", "text": f"Daily update for {up['date']} ({up['reviewStatus']})", "at": up.get("createdAt", "")})
        deadlines.sort(key=lambda d: d.get("due", ""))
        activity.sort(key=lambda a: a.get("at", ""), reverse=True)
        days_left = None
        if active and active.get("endDate"):
            try:
                days_left = (date.fromisoformat(active["endDate"]) - date.today()).days
            except ValueError:
                pass
        return {"role": role, "allocation": active, "allocations": als,
                "applications": apps, "certificates": certs,
                "deadlines": deadlines[:6], "activity": activity[:8],
                "daysRemaining": days_left, "notifications": notifs}

    if role == "mentor":
        als = [enrich_allocation(a) for a in
               store.col("allocations").find({"mentorId": u["_id"]})]
        interns = []
        for a in als:
            s = a["summary"]
            if a.get("flag") == "at_risk" or s["attendancePct"] < 60:
                dot = "at-risk"
            elif s["attendancePct"] < 75:
                dot = "attention"
            else:
                dot = "on-track"
            pending_u = store.col("updates").count_documents(
                {"allocationId": a["_id"], "reviewStatus": "pending"})
            pending_t = store.col("tasks").count_documents(
                {"allocationId": a["_id"], "status": "review"})
            interns.append({**a, "dot": dot, "pendingUpdates": pending_u, "pendingTasks": pending_t})
        aids = [a["_id"] for a in als]
        pending_updates = [dict(up, studentName=((pub(store.col("users").find_one(
            {"_id": (store.col("allocations").find_one({"_id": up["allocationId"]}) or {}).get("studentId")})) or {}).get("name", "")))
            for aid in aids for up in store.col("updates").find({"allocationId": aid, "reviewStatus": "pending"})]
        pending_tasks = []
        for aid in aids:
            al = store.col("allocations").find_one({"_id": aid}) or {}
            st = store.col("users").find_one({"_id": al.get("studentId")}) or {}
            for t in store.col("tasks").find({"allocationId": aid, "status": "review"}):
                pending_tasks.append({**t, "studentName": st.get("name", "")})
        upcoming_ms = []
        for aid in aids:
            for m in store.col("milestones").find({"allocationId": aid}):
                if m.get("status") != "completed":
                    upcoming_ms.append(m)
        upcoming_ms.sort(key=lambda m: m.get("dueDate", ""))
        return {"role": role, "interns": interns,
                "stats": {"active": len([a for a in als if a.get("status") == "active"]),
                          "onTrack": len([i for i in interns if i["dot"] == "on-track"]),
                          "attention": len([i for i in interns if i["dot"] != "on-track"]),
                          "pendingUpdates": len(pending_updates),
                          "pendingTasks": len(pending_tasks),
                          "upcomingMilestones": len(upcoming_ms)},
                "pendingUpdates": pending_updates, "pendingTasks": pending_tasks,
                "upcomingMilestones": upcoming_ms[:6], "notifications": notifs}

    if role == "company":
        my_ints = store.col("internships").find({"companyId": u["_id"]})
        iids = [i["_id"] for i in my_ints]
        apps = []
        for iid in iids:
            apps += [enrich_application(a) for a in store.col("applications").find({"internshipId": iid})]
        by_status: dict[str, int] = {}
        for a in apps:
            by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        interns = [enrich_allocation(a) for a in
                   store.col("allocations").find({"companyId": u["_id"]})]
        active_n = len([a for a in interns if a.get("status") == "active"])
        done_n = len([a for a in interns if a.get("status") == "completed"])
        total = active_n + done_n
        return {"role": role, "internships": my_ints, "applications": apps,
                "byStatus": by_status, "interns": interns,
                "stats": {"activeInternships": len([i for i in my_ints if i.get("status") == "open"]),
                          "totalApplications": len(apps),
                          "shortlisted": by_status.get("shortlisted", 0),
                          "selected": by_status.get("selected", 0) + by_status.get("allocated", 0),
                          "activeInterns": active_n, "completed": done_n,
                          "completionRate": round(done_n / total * 100) if total else 0},
                "notifications": notifs}

           
    return {"role": role,
            "stats": {"students": store.col("users").count_documents({"role": "student"}),
                      "mentors": store.col("users").count_documents({"role": "mentor"}),
                      "companies": store.col("users").count_documents({"role": "company"}),
                      "internships": store.col("internships").count_documents({}),
                      "applications": store.col("applications").count_documents({}),
                      "active": store.col("allocations").count_documents({"status": "active"}),
                      "completed": store.col("allocations").count_documents({"status": "completed"}),
                      "certificates": store.col("certificates").count_documents({"status": "valid"})},
            "notifications": notifs}


@api.get("/admin/activity")
def admin_activity(req: Request, limit: int = Query(30, le=100)):
    me(req, ["admin"])
    events = []
    for a in store.col("applications").find():
        st = store.col("users").find_one({"_id": a.get("studentId")}) or {}
        it = store.col("internships").find_one({"_id": a.get("internshipId")}) or {}
        events.append({"kind": "application", "text": f"{st.get('name','?')} → {it.get('title','?')} ({a['status']})",
                       "at": a.get("updatedAt", "")})
    for u in store.col("users").find():
        events.append({"kind": "user", "text": f"{u.get('name','?')} joined as {u.get('role')}", "at": u.get("createdAt", "")})
    for c in store.col("certificates").find():
        events.append({"kind": "certificate", "text": f"Certificate {c['_id']} → {c.get('studentName')} ({c.get('status')})", "at": c.get("issuedAt", "")})
    for i in store.col("internships").find():
        events.append({"kind": "internship", "text": f"{i.get('companyName')} posted “{i.get('title')}”", "at": i.get("createdAt", "")})
    events.sort(key=lambda e: e.get("at", ""), reverse=True)
    return events[:limit]


                                                                         
def _save_upload(owner: str, filename: str, data: bytes) -> tuple[str, str]:
    ext = os.path.splitext(filename or "")[1].lower()
    stored = f"{owner}_{nid('')}{ext}"
    path = os.path.join(UPLOAD_DIR, stored)
    with open(path, "wb") as f:
        f.write(data)
    return stored, path


@api.get("/files/{name}")
def serve_file(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "Invalid file")
    path = os.path.join(UPLOAD_DIR, name)
    if not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    ext = os.path.splitext(name)[1].lower()
    media = {".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
             ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        content = f.read()
    return Response(content=content, media_type=media)


@api.post("/uploads/resume")
async def upload_resume(req: Request, file: UploadFile = File(...)):
    u = me(req, ["student"])
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".pdf", ".docx", ".txt", ".md"):
        raise HTTPException(400, "Please upload a PDF, DOCX or TXT resume")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5MB)")
    stored, path = _save_upload(u["_id"], file.filename or "resume", data)
    try:
        parsed = parse_resume(path, file.filename or "resume.txt")
    except Exception as e:
        parsed = {"skills": [], "preview": "", "chars": 0, "emails": [], "phones": [], "error": str(e)}
    doc = {"_id": nid("r_"), "userId": u["_id"], "filename": file.filename,
           "stored": stored, "url": f"/api/files/{stored}",
           "skills": parsed.get("skills", []), "preview": parsed.get("preview", ""),
           "chars": parsed.get("chars", 0), "createdAt": now_iso()}
    store.col("resumes").insert_one(doc)
    store.col("users").update_one({"_id": u["_id"]},
                                  {"$set": {"resumeName": file.filename, "resumeUrl": doc["url"]}})
    return doc


@api.get("/uploads/resume/me")
def my_resume(req: Request):
    u = me(req, ["student"])
    rows = store.col("resumes").find({"userId": u["_id"]}, sort=[("createdAt", -1)], limit=1)
    return rows[0] if rows else None


@api.post("/uploads/document")
async def upload_document(req: Request, kind: str = Form("general"), label: str = Form(""),
                          allocationId: str = Form(""), file: UploadFile = File(...)):
    u = me(req)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")
    stored, _ = _save_upload(u["_id"], file.filename or "file", data)
    doc = {"_id": nid("d_"), "ownerId": u["_id"], "ownerName": u["name"],
           "kind": kind or "general", "label": label or (file.filename or "Document"),
           "filename": file.filename, "stored": stored, "url": f"/api/files/{stored}",
           "allocationId": allocationId or "", "createdAt": now_iso()}
    store.col("documents").insert_one(doc)
    return doc


@api.get("/uploads/documents")
def list_documents(req: Request, allocationId: str = "", ownerId: str = ""):
    u = me(req)
    q: dict = {}
    if allocationId:
        q["allocationId"] = allocationId
    elif ownerId and u["role"] in ("admin", "mentor", "company"):
        q["ownerId"] = ownerId
    else:
        q["ownerId"] = u["_id"]
    return store.col("documents").find(q, sort=[("createdAt", -1)])


                                                                          
@api.get("/reports/student")
def report_student(req: Request):
    u = me(req, ["student"])
    als = store.col("allocations").find({"studentId": u["_id"]})
    active = next((a for a in als if a.get("status") == "active"), als[0] if als else None)
    if not active:
        return {"empty": True}
    aid = active["_id"]
    updates = store.col("updates").find({"allocationId": aid})
    att = store.col("attendance").find({"allocationId": aid})
    tasks = store.col("tasks").find({"allocationId": aid})
    ms = store.col("milestones").find({"allocationId": aid})
    weekly_hours = _week_buckets([(x.get("date") or x.get("createdAt", ""), x.get("hours") or 0) for x in updates])
    weekly_present = _week_buckets([(x.get("date", ""), 1) for x in att if x.get("status") == "present"])
    att_split: dict[str, int] = {}
    for a in att:
        att_split[a.get("status", "present")] = att_split.get(a.get("status", "present"), 0) + 1
    task_split: dict[str, int] = {}
    for t in tasks:
        task_split[t.get("status", "todo")] = task_split.get(t.get("status", "todo"), 0) + 1
    return {"weeklyHours": weekly_hours, "weeklyPresent": weekly_present,
            "attendance": att_split, "tasks": task_split,
            "milestones": [{"title": m.get("title"), "percent": m.get("percent", 0),
                            "status": m.get("status")} for m in ms],
            "summary": allocation_summary(active)}


@api.get("/reports/mentor")
def report_mentor(req: Request):
    u = me(req, ["mentor"])
    als = [enrich_allocation(a) for a in store.col("allocations").find({"mentorId": u["_id"]})]
    interns = []
    pend_u_total = pend_t_total = 0
    reviewed = []
    for a in als:
        pu = store.col("updates").count_documents({"allocationId": a["_id"], "reviewStatus": "pending"})
        pt = store.col("tasks").count_documents({"allocationId": a["_id"], "status": "review"})
        pend_u_total += pu
        pend_t_total += pt
        interns.append({"name": (a.get("student") or {}).get("name", "?"),
                        "attendancePct": a["summary"]["attendancePct"],
                        "progress": a["summary"]["progress"],
                        "tasksDone": a["summary"]["tasks"]["done"],
                        "tasksTotal": a["summary"]["tasks"]["total"],
                        "pending": pu + pt})
        for up in store.col("updates").find({"allocationId": a["_id"]}):
            if up.get("reviewStatus") != "pending":
                reviewed.append(((up.get("createdAt", "") or "")[:10], 1))
    return {"interns": interns, "reviewsPerWeek": _week_buckets(reviewed, 6),
            "pending": {"updates": pend_u_total, "tasks": pend_t_total}}


@api.get("/reports/company")
def report_company(req: Request):
    u = me(req, ["company"])
    my_ints = store.col("internships").find({"companyId": u["_id"]})
    apps = []
    for i in my_ints:
        apps += store.col("applications").find({"internshipId": i["_id"]})
    funnel: dict[str, int] = {}
    for a in apps:
        k = "selected" if a["status"] in ("selected", "allocated") else a["status"]
        funnel[k] = funnel.get(k, 0) + 1
    interns = [enrich_allocation(a) for a in store.col("allocations").find({"companyId": u["_id"]})]
    return {"funnel": funnel,
            "appsPerWeek": _week_buckets([((a.get("appliedAt", "") or "")[:10], 1) for a in apps]),
            "interns": [{"name": (a.get("student") or {}).get("name", "?"),
                         "role": (a.get("internship") or {}).get("title", ""),
                         "progress": a["summary"]["progress"],
                         "attendancePct": a["summary"]["attendancePct"],
                         "status": a.get("status")} for a in interns]}


@api.get("/reports/admin")
def report_admin(req: Request):
    me(req, ["admin"])
    users = store.col("users").find()
    roles: dict[str, int] = {}
    for x in users:
        roles[x.get("role", "?")] = roles.get(x.get("role", "?"), 0) + 1
    by_status: dict[str, int] = {}
    for a in store.col("applications").find():
        by_status[a.get("status", "?")] = by_status.get(a.get("status", "?"), 0) + 1
    by_domain: dict[str, int] = {}
    for i in store.col("internships").find():
        by_domain[i.get("domain", "General")] = by_domain.get(i.get("domain", "General"), 0) + 1
    by_alloc: dict[str, int] = {}
    for a in store.col("allocations").find():
        by_alloc[a.get("status", "?")] = by_alloc.get(a.get("status", "?"), 0) + 1
    return {"newUsersPerWeek": _week_buckets([((x.get("createdAt", "") or "")[:10], 1) for x in users], 10),
            "usersByRole": roles, "appsByStatus": by_status,
            "internshipsByDomain": by_domain, "allocationsByStatus": by_alloc,
            "outbox": store.col("outbox").count_documents({})}


@api.get("/admin/outbox")
def outbox(req: Request, limit: int = Query(50, le=200)):
    me(req, ["admin"])
    return store.col("outbox").find(sort=[("createdAt", -1)], limit=limit)


                                                                                           
class AllocateIn(BaseModel):
    applicationId: str
    mentorId: str = ""


@api.post("/allocations")
def create_allocation(body: AllocateIn, req: Request):
    u = me(req, ["company", "admin"])
    a = store.col("applications").find_one({"_id": body.applicationId})
    if not a:
        raise HTTPException(404, "Application not found")
    it = store.col("internships").find_one({"_id": a["internshipId"]}) or {}
    if u["role"] == "company" and it.get("companyId") != u["_id"]:
        raise HTTPException(403, "Not your application")
    if a.get("status") == "rejected":
        raise HTTPException(400, "Application was rejected")
    auto = False
    mentor = None
    if body.mentorId:
        mentor = store.col("users").find_one({"_id": body.mentorId, "role": "mentor"})
        if not mentor:
            raise HTTPException(400, "Mentor not found")
    else:
        mentor = _pick_mentor(it)
        auto = True
    ex = store.col("allocations").find_one({"studentId": a["studentId"], "internshipId": a["internshipId"]})
    if ex:
        store.col("allocations").update_one(
            {"_id": ex["_id"]},
            {"$set": {"mentorId": (mentor or {}).get("_id", ""), "status": "active", "updatedAt": now_iso()}})
        allocation = store.col("allocations").find_one({"_id": ex["_id"]})
    else:
        allocation = {"_id": nid("al_"), "studentId": a["studentId"], "internshipId": a["internshipId"],
                      "companyId": it.get("companyId"), "mentorId": (mentor or {}).get("_id", ""),
                      "status": "active", "startDate": it.get("startDate", date.today().isoformat()),
                      "endDate": "", "progress": 0, "createdAt": now_iso(), "updatedAt": now_iso()}
        store.col("allocations").insert_one(allocation)
    st = store.col("users").find_one({"_id": a["studentId"]}) or {}
    offer_name = f"offer_{allocation['_id']}.txt"
    try:
        with open(os.path.join(UPLOAD_DIR, offer_name), "w") as fh:
            fh.write(f"INTERNOVA OFFER LETTER\n{'=' * 40}\n\nDear {st.get('name', 'Intern')},\n\n"
                     f"{it.get('companyName', 'The company')} is delighted to offer you the position of "
                     f"{it.get('title', 'Intern')} ({it.get('mode', '')}, {it.get('location', '')}).\n\n"
                     f"Duration: {it.get('duration', '')} | Stipend: {it.get('stipend', '')} | Start: {allocation['startDate']}\n"
                     f"Mentor: {(mentor or {}).get('name', 'To be assigned')}\n\n"
                     "Verify this offer anytime inside your InterNova dashboard.\n\n— Team InterNova\n")
        offer_url = f"/api/files/{offer_name}"
    except Exception:
        offer_url = ""
    store.col("applications").update_one(
        {"_id": a["_id"]}, {"$set": {"status": "allocated", "offerUrl": offer_url, "updatedAt": now_iso()}})
    if mentor:
        mates = sorted([a["studentId"], mentor["_id"]])
        exists = any(sorted(t.get("participants", [])) == mates for t in store.col("threads").find())
        if not exists:
            store.col("threads").insert_one(
                {"_id": nid("th_"), "allocationId": allocation["_id"],
                 "participants": [a["studentId"], mentor["_id"]], "subject": it.get("title", "Internship"),
                 "messages": [{"fromId": mentor["_id"],
                               "text": f"Welcome aboard! I'm {mentor.get('name', 'your mentor')} — let's plan your first week.",
                               "at": now_iso()}],
                 "createdAt": now_iso(), "updatedAt": now_iso()})
    notify(a["studentId"], "You're onboarded!",
           f"{it.get('companyName', 'Your company')} accepted your application for {it.get('title', 'the internship')}.",
           "/dashboard/student?tab=internship", "success")
    if mentor:
        notify(mentor["_id"], "New intern assigned",
               f"{st.get('name', 'A student')} was allocated to {it.get('title', 'an internship')}.",
               "/dashboard/mentor?tab=interns")
    return {"allocation": enrich_allocation(allocation), "autoAssigned": auto,
            "mentorName": (mentor or {}).get("name", ""), "offerUrl": offer_url}


@api.get("/match/recommended")
def recommended(req: Request, limit: int = Query(6, le=12)):
    u = me(req, ["student"])
    stu = store.col("users").find_one({"_id": u["_id"]}) or u
    past = [enrich_application(a) for a in store.col("applications").find({"studentId": u["_id"]})]
    applied = {a["internshipId"] for a in past}
    out = []
    for it in store.col("internships").find():
        if it.get("_id") in applied or it.get("status") == "closed":
            continue
        score, reasons = _score_internship_for_student(it, stu, past)
        out.append({"internship": it, "score": score, "reasons": reasons})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out[:limit]


@api.get("/match/rank")
def rank_applicants(req: Request, internshipId: str = Query("")):
    u = me(req, ["company", "admin"])
    it = store.col("internships").find_one({"_id": internshipId}) or {}
    if u["role"] == "company" and it.get("companyId") != u["_id"]:
        raise HTTPException(403, "Not your role")
    out = []
    for a in store.col("applications").find({"internshipId": internshipId}):
        ea = enrich_application(a)
        score, reasons = _score_applicant(ea, it)
        out.append({"application": ea, "score": score, "reasons": reasons})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out


class AnnounceIn(BaseModel):
    title: str
    body: str
    roles: list[str] = []


@api.post("/admin/announcements")
def post_announcement(body: AnnounceIn, req: Request):
    u = me(req, ["admin"])
    if not body.title.strip() or not body.body.strip():
        raise HTTPException(400, "Title and body are required")
    roles = [r for r in body.roles if r in ("student", "mentor", "company", "admin")] or ["student", "mentor", "company"]
    ann = {"_id": nid("an_"), "title": body.title.strip(), "body": body.body.strip(),
           "roles": roles, "by": u["name"], "createdAt": now_iso()}
    store.col("announcements").insert_one(ann)
    n = 0
    for x in store.col("users").find():
        if x.get("role") in roles:
            notify(x["_id"], f"\U0001F4E2 {ann['title']}", ann["body"],
                   f"/dashboard/{x['role']}?tab=notifications", "announcement")
            n += 1
    return {"announcement": ann, "notified": n}


@api.get("/announcements")
def list_announcements(req: Request):
    u = me(req)
    rows = store.col("announcements").find(sort=[("createdAt", -1)], limit=20)
    return [r for r in rows if u.get("role") in (r.get("roles") or []) or u.get("role") == "admin"]


@api.get("/presence")
def presence(req: Request):
    me(req)
    return {"online": _online_ids()}


@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket, token: str = Query("")):
    try:
        payload = A.decode_token(token)
        u = store.col("users").find_one({"_id": payload.get("sub")})
        if not u:
            raise ValueError("no user")
    except Exception:
        await ws.close(code=4401)
        return
    await ws.accept()
    uid = u["_id"]
    ws_clients.setdefault(uid, set()).add(ws)
    await _ws_broadcast({"t": "presence", "online": _online_ids()})
    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("t") == "ping":
                await ws.send_json({"t": "pong"})
            elif msg.get("t") == "typing" and msg.get("threadId"):
                for p in _thread_mates(msg["threadId"], uid):
                    await _ws_send(p, {"t": "typing", "threadId": msg["threadId"],
                                       "fromId": uid, "fromName": u["name"]})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_clients.get(uid, set()).discard(ws)
        if not ws_clients.get(uid):
            ws_clients.pop(uid, None)
        await _ws_broadcast({"t": "presence", "online": _online_ids()})


                                                                                
class SessionIn(BaseModel):
    allocationId: str = ""
    title: str = ""
    description: str = ""
    date: str = ""
    durationMin: int = 30
    meetLink: str = ""


@api.get("/sessions")
def list_sessions(req: Request, allocationId: str = Query("")):
    u = me(req)
    if allocationId:
        if not _alloc_for(u, allocationId):
            raise HTTPException(404, "Allocation not found")
        rows = store.col("sessions").find({"allocationId": allocationId})
    else:
        ids = set(_my_allocation_ids(u))
        rows = [x for x in store.col("sessions").find() if x.get("allocationId") in ids]
    rows = sorted(rows, key=lambda x: x.get("date", ""))
    return [_enrich_session(x) for x in rows]


@api.get("/sessions/upcoming")
def upcoming_sessions(req: Request, days: int = Query(14, le=60)):
    u = me(req)
    ids = set(_my_allocation_ids(u))
    lo = now_iso()
    hi_d = (date.today() + timedelta(days=days)).isoformat()
    rows = [x for x in store.col("sessions").find()
            if x.get("allocationId") in ids and x.get("status") in ("proposed", "confirmed")
            and (x.get("date", "") or "") >= lo and (x.get("date", "") or "")[:10] <= hi_d]
    rows = sorted(rows, key=lambda x: x.get("date", ""))
    return [_enrich_session(x) for x in rows]


@api.post("/sessions")
def create_session(body: SessionIn, req: Request):
    u = me(req)
    al = _alloc_for(u, body.allocationId)
    if not al:
        raise HTTPException(404, "Allocation not found")
    when = (body.date or "").strip()
    if len(when) < 10:
        raise HTTPException(400, "A valid date & time is required")
    status = "proposed" if u["role"] == "student" else "confirmed"
    s = {"_id": nid("se_"), "allocationId": al["_id"],
         "title": body.title.strip() or "Mentor session",
         "description": body.description.strip(), "date": when,
         "durationMin": max(10, min(240, body.durationMin or 30)),
         "meetLink": body.meetLink.strip(), "status": status,
         "proposedBy": u["_id"], "notes": "", "actionItems": [],
         "createdAt": now_iso(), "updatedAt": now_iso(), "remindersSent": []}
    store.col("sessions").insert_one(s)
    en = _enrich_session(s)
    other = en["mentor"] if u["role"] == "student" else en["student"]
    o_role = "mentor" if u["role"] == "student" else "student"
    o_tab = "interns" if o_role == "mentor" else "internship"
    if other.get("_id"):
        notify(other["_id"], "Session proposed" if status == "proposed" else "Session scheduled",
               f"{u['name']} scheduled \u201c{s['title']}\u201d for {when[:16].replace('T', ' ')}.",
               f"/dashboard/{o_role}?tab={o_tab}")
        if other.get("email"):
            E.send_template(other["email"], E.session_scheduled(
                other["name"], s["title"], when[:16].replace("T", " "),
                u["name"], f"{E.FRONTEND}/dashboard/{o_role}?tab={o_tab}", s["meetLink"]),
                "session", other["_id"])
    return en


@api.patch("/sessions/{sid}")
def patch_session(sid: str, body: dict, req: Request):
    u = me(req)
    s = store.col("sessions").find_one({"_id": sid})
    if not s or not _alloc_for(u, s["allocationId"]):
        raise HTTPException(404, "Session not found")
    role = u["role"]
    patch: dict = {}
    if "status" in body:
        ns = str(body["status"]).strip().lower()
        if ns not in ("proposed", "confirmed", "completed", "cancelled"):
            raise HTTPException(400, "Invalid status")
        if role == "student" and not (ns == "cancelled" and s.get("proposedBy") == u["_id"] and s.get("status") == "proposed"):
            raise HTTPException(403, "Only your mentor can update this session")
        patch["status"] = ns
    if role != "student":
        for k in ("title", "description", "date", "meetLink", "notes"):
            if k in body and body[k] is not None:
                patch[k] = body[k]
        if "durationMin" in body:
            patch["durationMin"] = max(10, min(240, int(body["durationMin"] or 30)))
        if "actionItems" in body and isinstance(body["actionItems"], list):
            patch["actionItems"] = [{"text": str(x.get("text", ""))[:200], "done": bool(x.get("done"))}
                                    for x in body["actionItems"]][:20]
    if not patch:
        return _enrich_session(s)
    patch["updatedAt"] = now_iso()
    store.col("sessions").update_one({"_id": sid}, {"$set": patch})
    s = store.col("sessions").find_one({"_id": sid})
    en = _enrich_session(s)
    if patch.get("status") == "confirmed":
        stu = en["student"]
        if stu.get("_id"):
            notify(stu["_id"], "Session confirmed",
                   f"\u201c{s['title']}\u201d is confirmed for {s['date'][:16].replace('T', ' ')}.",
                   "/dashboard/student?tab=internship")
            if stu.get("email"):
                E.send_template(stu["email"], E.session_confirmed(
                    stu["name"], s["title"], s["date"][:16].replace("T", " "),
                    f"{E.FRONTEND}/dashboard/student?tab=internship", s.get("meetLink", "")),
                    "session", stu["_id"])
    return en


@api.post("/admin/session-reminders")
def session_reminders(req: Request):
    me(req, ["admin"])
    lo = now_iso()
    hi = (date.today() + timedelta(days=1)).isoformat()
    sent = 0
    for s in store.col("sessions").find({"status": "confirmed"}):
        d = (s.get("date", "") or "")
        if not (lo <= d and d[:10] <= hi) or "24h" in (s.get("remindersSent") or []):
            continue
        en = _enrich_session(s)
        people = [("student", en["student"], "internship", en["mentor"]["name"]),
                  ("mentor", en["mentor"], "interns", en["student"]["name"])]
        for role, person, tab, other in people:
            if not person.get("_id"):
                continue
            notify(person["_id"], "Session reminder",
                   f"\u201c{s['title']}\u201d is coming up at {d[:16].replace('T', ' ')}.",
                   f"/dashboard/{role}?tab={tab}")
            if person.get("email"):
                E.send_template(person["email"], E.session_reminder(
                    person["name"], s["title"], d[:16].replace("T", " "), other,
                    f"{E.FRONTEND}/dashboard/{role}?tab={tab}", s.get("meetLink", "")),
                    "session", person["_id"])
        store.col("sessions").update_one({"_id": s["_id"]}, {"$set": {"remindersSent": (s.get("remindersSent") or []) + ["24h"]}})
        sent += 1
    return {"reminded": sent}


@api.get("/insights/weekly")
def insights_weekly(req: Request, allocationId: str = Query("")):
    u = me(req)
    al = _alloc_for(u, allocationId)
    if not al:
        raise HTTPException(404, "Allocation not found")
    d = _digest_for(allocationId)
    d["allocation"] = enrich_allocation(al)
    return d


@api.get("/insights/overview")
def insights_overview(req: Request):
    u = me(req)
    out = []
    for aid in _my_allocation_ids(u):
        al = store.col("allocations").find_one({"_id": aid}) or {}
        if al.get("status") == "completed" and u.get("role") != "admin":
            continue
        d = _digest_for(aid)
        st = store.col("users").find_one({"_id": al.get("studentId")}) or {}
        it = store.col("internships").find_one({"_id": al.get("internshipId")}) or {}
        out.append({"allocationId": aid, "internName": st.get("name", "?"),
                    "role": it.get("title", ""), "companyName": it.get("companyName", ""),
                    "score": d["score"], "risks": d["risks"][:3], "highlights": d["highlights"][:3],
                    "hours7": d["hours7"], "attendance7": d["attendance7"],
                    "tasksDone7": d["tasksDone7"], "updates7": d["updates7"]})
    out.sort(key=lambda x: x["score"])
    return out


app.include_router(api, prefix="/api")


@app.get("/")
def root():
    return {"service": "internova-api", "docs": "/docs", "health": "/api/health"}
