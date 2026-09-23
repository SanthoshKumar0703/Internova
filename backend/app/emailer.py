from __future__ import annotations
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .store import nid, now_iso, store

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587") or 587)
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM = os.getenv("SMTP_FROM", "InterNova <no-reply@internova.app>")
FRONTEND = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _base(preheader: str, heading: str, body: str, cta: tuple[str, str] | None = None) -> str:
    btn = ""
    if cta:
        btn = (f'<p style="margin:26px 0 6px"><a href="{cta[1]}" '
               f'style="display:inline-block;background:#7b39fc;color:#fff;text-decoration:none;'
               f'font-weight:700;padding:12px 28px;border-radius:999px">{cta[0]}</a></p>')
    return f"""<!doctype html><html><body style="margin:0;background:#0b0714;font-family:Inter,Arial,sans-serif;color:#f5f1e8">
<div style="display:none;max-height:0;overflow:hidden">{preheader}</div>
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="background:linear-gradient(135deg,#7b39fc,#b5179e);border-radius:20px 20px 0 0;padding:28px;text-align:center">
<span style="font-size:30px;font-style:italic;font-family:Georgia,serif;color:#fff">N</span>
<p style="margin:6px 0 0;font-size:12px;letter-spacing:4px;color:rgba(255,255,255,.85);font-weight:700">INTERNOVA</p></div>
<div style="background:#14121c;border:1px solid #26232e;border-top:none;border-radius:0 0 20px 20px;padding:30px 28px">
<h1 style="margin:0 0 14px;font-size:22px">{heading}</h1>
<div style="font-size:14.5px;line-height:1.65;color:#cfc9de">{body}</div>{btn}
<p style="margin:26px 0 0;font-size:12px;color:#7d7791">InterNova · From application to achievement.<br>
If you didn't expect this email, you can safely ignore it.</p>
</div></div></body></html>"""


def welcome(name: str, role: str) -> tuple[str, str]:
    first = name.split(" ")[0]
    link = f"{FRONTEND}/dashboard/{role}"
    return (f"Welcome to InterNova, {first}!",
            _base("Your account is ready.", f"Welcome aboard, {first}!",
                  f"<p>Your <b>{role}</b> account is ready. Here's the fastest way to get value:</p>"
                  f"<p>{'Complete your profile, then search verified internships and apply with one click.'
                   if role == 'student' else
                   'Complete your company profile, post your first internship, and watch applications roll in.'}</p>",
                  ("Open your dashboard", link)))


def otp(name: str, code: str) -> tuple[str, str]:
    return ("Your InterNova sign-in code",
            _base(f"Your code is {code}.", "Your sign-in code",
                  f"<p>Hi {name.split(' ')[0]}, use this code to finish signing in. It expires in <b>5 minutes</b>:</p>"
                  f'<p style="font-size:34px;letter-spacing:10px;font-weight:800;color:#fff;background:#1e1830;'
                  f'text-align:center;border-radius:14px;padding:14px 0;margin:18px 0">{code}</p>'
                  f"<p>If you didn't request this, your password may be compromised — reset it right away.</p>"))


def reset(name: str, token: str) -> tuple[str, str]:
    url = f"{FRONTEND}/login?reset={token}"
    return ("Reset your InterNova password",
            _base("Password reset requested.", "Reset your password",
                  f"<p>Hi {name.split(' ')[0]}, click below to set a new password. This link expires in <b>1 hour</b>.</p>",
                  ("Set new password", url)))


def app_status(name: str, internship: str, status: str) -> tuple[str, str]:
    label = status.replace("_", " ")
    emoji_map = {"shortlisted": "shortlisted", "selected": "selected", "rejected": "rejected"}
    _ = emoji_map                                 
    return (f"Application update: {label} — {internship}",
            _base(f"Your application is now {label}.", f"You're <i>{label}</i>!",
                  f"<p>Hi {name.split(' ')[0]}, your application for <b>{internship}</b> moved to "
                  f"<b>{label}</b>. Open your dashboard to see the full journey stepper.</p>",
                  ("Track application", f"{FRONTEND}/dashboard/student?tab=applications")))


def certificate(name: str, code: str, role: str, company: str) -> tuple[str, str]:
    url = f"{FRONTEND}/verify/{code}"
    return (f"Your certificate is ready — {code}",
            _base("Certificate issued.", "Achievement unlocked!",
                  f"<p>Hi {name.split(' ')[0]}, congratulations on completing <b>{role}</b> at "
                  f"<b>{company}</b>! Your verifiable certificate <b>{code}</b> is ready.</p>",
                  ("View certificate", url)))


def task_assigned(name: str, task: str, due: str) -> tuple[str, str]:
    return (f"New task: {task}",
            _base("A new task was assigned.", "New task assigned",
                  f"<p>Hi {name.split(' ')[0]}, your mentor assigned <b>{task}</b>"
                  f"{f' — due <b>{due}</b>' if due else ''}.</p>",
                  ("Open tasks", f"{FRONTEND}/dashboard/student?tab=internship")))


def feedback_received(name: str, mentor: str, excerpt: str) -> tuple[str, str]:
    return (f"New feedback from {mentor}",
            _base("Your mentor left feedback.", "Mentor feedback",
                  f"<p>Hi {name.split(' ')[0]}, <b>{mentor}</b> left feedback on your work:</p>"
                  f"<p><i>“{excerpt[:220]}”</i></p>",
                  ("Read feedback", f"{FRONTEND}/dashboard/student?tab=internship")))


def session_scheduled(name: str, title: str, when: str, other: str, dashboard: str, link: str = "") -> tuple[str, str]:
    join = f'<p>Join: <a href="{link}">{link}</a></p>' if link else ""
    return (f"Session scheduled: {title} — {when}",
            _base("A mentor session was scheduled.", "Session on the calendar",
                  f"<p>Hi {name.split(' ')[0]}, <b>{other}</b> scheduled <b>{title}</b> for <b>{when}</b>.</p>{join}",
                  ("Open sessions", dashboard)))


def session_confirmed(name: str, title: str, when: str, dashboard: str, link: str = "") -> tuple[str, str]:
    join = f'<p>Join: <a href="{link}">{link}</a></p>' if link else ""
    return (f"Confirmed: {title} — {when}",
            _base("Your session was confirmed.", "You're confirmed",
                  f"<p>Hi {name.split(' ')[0]}, <b>{title}</b> is confirmed for <b>{when}</b>.</p>{join}",
                  ("Open sessions", dashboard)))


def session_reminder(name: str, title: str, when: str, other: str, dashboard: str, link: str = "") -> tuple[str, str]:
    join = f'<p>Join: <a href="{link}">{link}</a></p>' if link else ""
    return (f"Reminder: {title} is soon ({when})",
            _base("Upcoming mentor session.", "Don't forget!",
                  f"<p>Hi {name.split(' ')[0]}, a quick reminder — <b>{title}</b> with <b>{other}</b> is coming up at "
                  f"<b>{when}</b>.</p>{join}",
                  ("Open sessions", dashboard)))


def send(to_email: str, subject: str, html: str, kind: str = "general",
         user_id: str = "") -> dict:
    rec = {"_id": nid("e_"), "to": to_email, "subject": subject, "kind": kind,
           "userId": user_id, "html": html, "status": "queued", "createdAt": now_iso()}
    if SMTP_HOST and SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(FROM, [to_email], msg.as_string())
            rec["status"] = "sent"
        except Exception as e:
            rec["status"] = f"failed: {e}"
    else:
        rec["status"] = "demo-logged (SMTP not configured)"
    try:
        store.col("outbox").insert_one(rec)
    except Exception:
        pass
    print(f"[internova-email] {rec['status']} :: {subject} -> {to_email}", flush=True)
    return rec


def send_template(to_email: str, tpl: tuple[str, str], kind: str, user_id: str = ""):
    try:
        subject, html = tpl
        return send(to_email, subject, html, kind, user_id)
    except Exception as e:
        print(f"[internova-email] error: {e}", flush=True)
        return None
