from __future__ import annotations
import json
import os
import re

import requests

SKILLS_DB = [
                     
    "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust",
    "PHP", "Ruby", "Kotlin", "Swift", "Dart", "HTML", "CSS",
              
    "React", "Next.js", "Vue", "Angular", "Svelte", "Flutter", "React Native",
    "Tailwind CSS", "Bootstrap", "Redux", "Figma",
             
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring", "Laravel",
    ".NET", "GraphQL", "REST APIs",
               
    "SQL", "Pandas", "NumPy", "PyTorch", "TensorFlow", "Scikit-learn",
    "Power BI", "Tableau", "Excel", "Statistics", "Machine Learning",
    "Deep Learning", "NLP", "Computer Vision",
                    
    "Git", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform",
    "CI/CD", "Linux", "Bash", "Nginx", "Firebase", "Jenkins",
                 
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "SQLite",
                     
    "OWASP", "Networking", "Penetration Testing", "Agile", "Scrum",
    "System Design", "Data Structures", "Algorithms", "Prototyping",
    "User Research", "Design Systems",
]

_EMAIL = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE = re.compile(r"(\+?\d[\d\s\-]{8,}\d)")


def extract_text(path: str, filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if ext == ".docx":
        import docx
        doc = docx.Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
                           
    with open(path, "r", errors="ignore") as f:
        return f.read()


def extract_skills(text: str) -> list[str]:
    found: dict[str, int] = {}
    for skill in SKILLS_DB:
                                                                           
        pat = r"(?<![\w+#.])" + re.escape(skill) + r"(?![\w+#])"
        try:
            n = len(re.findall(pat, text, flags=re.IGNORECASE))
        except re.error:
            n = 0
        if n:
            found[skill] = n
    return sorted(found, key=lambda s: (-found[s], s))


def _extract_name(text: str) -> str | None:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for line in lines[:12]:
        s = re.sub(r"\s+", " ", line).strip()
        if len(s) < 3 or len(s) > 80:
            continue
        low = s.lower()
        if any(tag in low for tag in ["resume", "skills", "education", "experience", "contact", "profile", "summary"]):
            continue
        if any(ch.isdigit() for ch in s):
            continue
        if re.fullmatch(r"[A-Z][A-Za-z'.,&()-]+(?:\s+[A-Z][A-Za-z'.,&()-]+){1,6}", s):
            return s
    return None


def _extract_degree(text: str) -> str | None:
    patterns = [
        r"\b(?:B\.Tech|BTech|BE|B\.E|BSc|B\.Sc|BS|BA|BCA|MBA|M\.Tech|MTech|MS|MSc|M\.Sc|Bachelor(?:'s)?|Master(?:'s)?)\s*(?:in\s+)?([A-Za-z&/.,() -]{3,80})",
        r"\b(?:Computer Science|Electronics|Mechanical|Civil|Electrical|Information Technology|Data Science|Computer Engineering|Artificial Intelligence|Mathematics|Statistics)\b.*",
    ]
    for pat in patterns:
        match = re.search(pat, text, flags=re.IGNORECASE)
        if match:
            val = match.group(1) if match.lastindex else match.group(0)
            s = re.sub(r"\s+", " ", str(val)).strip(" .,-")
            if s and not s.lower().startswith("resume"):
                return s
    return None


def _extract_college(text: str) -> str | None:
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines() if ln.strip()]
    for line in lines[:20]:
        low = line.lower()
        if any(token in low for token in ["university", "college", "institute", "school", "vit", "iit", "nit", "srm", "bits", "amity", "mit", "iiit"]):
            return line
    return None


def _extract_year(text: str) -> str | None:
    match = re.search(r"\b(?:graduat(?:ing|ion)|passing|batch|class of)\s*(?:of\s+)?(19\d{2}|20\d{2})\b", text, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    years = re.findall(r"\b(19\d{2}|20\d{2})\b", text)
    return years[0] if years else None


def _normalize_list(xs) -> list[str]:
    items = []
    if isinstance(xs, list):
        items = xs
    elif isinstance(xs, tuple):
        items = list(xs)
    elif isinstance(xs, str):
        items = [xs]
    out = []
    seen = set()
    for item in items:
        text = str(item).strip()
        if not text or text.lower() in {"null", "none"}:
            continue
        key = text.lower()
        if key not in seen:
            seen.add(key)
            out.append(text)
    return out


def _normalize_preferred_roles(items) -> list[str]:
    roles = []
    for item in _normalize_list(items):
        text = str(item).strip()
        if not text:
            continue
        text = re.sub(r"\s+", " ", text)
        text = text.replace(" ai ", " AI ").replace("ml ", "ML ")
        text = " ".join(part.capitalize() if part.lower() not in {"ai", "ml", "ui", "ux", "qa", "ui/ux"} else part.upper() for part in text.split())
        roles.append(text)
    return roles


def _extract_gemini_json_text(payload: dict) -> str:
    try:
        candidates = payload.get("candidates") or []
        for candidate in candidates:
            parts = (candidate.get("content") or {}).get("parts") or []
            for part in parts:
                text = part.get("text") if isinstance(part, dict) else None
                if isinstance(text, str) and text.strip():
                    return text.strip()
        return ""
    except Exception:
        return ""


def _call_gemini_resume_analysis(path: str, filename: str) -> dict | None:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return None

    try:
        text = extract_text(path, filename) or ""
        model = (os.getenv("GEMINI_MODEL") or "gemini-2.5-flash-lite").strip() or "gemini-2.5-flash-lite"
        payload = {
            "contents": [{
                "parts": [{
                    "text": (
                        "Extract the candidate profile from this resume and return only valid JSON. "
                        "Use keys exactly: name, degree, college, year, phone, email, skills, education, projects, experience, certifications, interests, preferredRoles, summary. "
                        "For skills, return a list of clear technology and domain skills only. "
                        "For the list fields, return arrays of strings. If a field is missing, use an empty array or null for text fields.\n\n" + text[:20000]
                    )
                }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            json=payload,
            timeout=45,
        )
        if response.status_code >= 400:
            return None
        data = response.json()
        raw = _extract_gemini_json_text(data)
        if not raw:
            return None
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            return None
        education = _normalize_list(parsed.get("education") or ([parsed.get("degree")] if parsed.get("degree") else []))
        projects = _normalize_list(parsed.get("projects"))
        experience = _normalize_list(parsed.get("experience"))
        certifications = _normalize_list(parsed.get("certifications"))
        interests = _normalize_list(parsed.get("interests"))
        preferred_roles = _normalize_preferred_roles(parsed.get("preferredRoles") or ([parsed.get("summary")] if parsed.get("summary") else []))
        skills = _normalize_list(parsed.get("skills"))
        return {
            "name": parsed.get("name") or None,
            "degree": parsed.get("degree") or None,
            "college": parsed.get("college") or None,
            "year": parsed.get("year") or None,
            "phone": parsed.get("phone") or None,
            "email": parsed.get("email") or None,
            "skills": skills,
            "education": education,
            "projects": projects,
            "experience": experience,
            "certifications": certifications,
            "interests": interests,
            "preferredRoles": preferred_roles,
            "summary": parsed.get("summary") or None,
            "preview": text[:900],
            "chars": len(text),
        }
    except Exception:
        return None


def parse_resume(path: str, filename: str) -> dict:
    text = extract_text(path, filename) or ""
    text = re.sub(r"[ \t]+", " ", text).strip()
    local = {
        "name": _extract_name(text),
        "degree": _extract_degree(text),
        "college": _extract_college(text),
        "year": _extract_year(text),
        "phone": None,
        "email": None,
        "chars": len(text),
        "preview": text[:900],
        "skills": extract_skills(text)[:30],
        "education": [ _extract_degree(text) ] if _extract_degree(text) else [],
        "projects": [],
        "experience": [],
        "certifications": [],
        "interests": [],
        "preferredRoles": [],
        "summary": None,
        "emails": sorted(set(_EMAIL.findall(text)))[:3],
        "phones": sorted(set(m.strip() for m in _PHONE.findall(text)))[:3],
    }
    if local["phones"]:
        local["phone"] = local["phones"][0]
    if local["emails"]:
        local["email"] = local["emails"][0]

    gemini = _call_gemini_resume_analysis(path, filename)
    if gemini:
        gemini["education"] = _normalize_list(gemini.get("education") or ([gemini.get("degree")] if gemini.get("degree") else []))
        gemini["projects"] = _normalize_list(gemini.get("projects"))
        gemini["experience"] = _normalize_list(gemini.get("experience"))
        gemini["certifications"] = _normalize_list(gemini.get("certifications"))
        gemini["interests"] = _normalize_list(gemini.get("interests"))
        gemini["preferredRoles"] = _normalize_preferred_roles(gemini.get("preferredRoles") or ([gemini.get("summary")] if gemini.get("summary") else []))
        merged_skills = sorted(set((local["skills"] or []) + (gemini.get("skills") or [])))
        result = {
            "name": gemini.get("name") or local["name"],
            "degree": gemini.get("degree") or local["degree"],
            "college": gemini.get("college") or local["college"],
            "year": gemini.get("year") or local["year"],
            "phone": gemini.get("phone") or local["phone"],
            "email": gemini.get("email") or local["email"],
            "chars": local["chars"],
            "preview": local["preview"] or gemini.get("preview") or "",
            "skills": merged_skills,
            "education": gemini.get("education") or local["education"],
            "projects": gemini.get("projects") or local["projects"],
            "experience": gemini.get("experience") or local["experience"],
            "certifications": gemini.get("certifications") or local["certifications"],
            "interests": gemini.get("interests") or local["interests"],
            "preferredRoles": gemini.get("preferredRoles") or local["preferredRoles"],
            "summary": gemini.get("summary") or local["summary"],
            "emails": gemini.get("email") and [gemini["email"]] or local["emails"],
            "phones": [gemini["phone"]] if gemini.get("phone") else local["phones"],
        }
        return result

    return {
        "name": local["name"],
        "degree": local["degree"],
        "college": local["college"],
        "year": local["year"],
        "phone": local["phone"],
        "email": local["email"],
        "chars": len(text),
        "preview": text[:900],
        "skills": local["skills"],
        "education": local["education"],
        "projects": local["projects"],
        "experience": local["experience"],
        "certifications": local["certifications"],
        "interests": local["interests"],
        "preferredRoles": local["preferredRoles"],
        "summary": local["summary"],
        "emails": local["emails"],
        "phones": local["phones"],
    }
