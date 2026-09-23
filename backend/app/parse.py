from __future__ import annotations
import os
import re

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


def parse_resume(path: str, filename: str) -> dict:
    text = extract_text(path, filename) or ""
    text = re.sub(r"[ \t]+", " ", text).strip()
    return {
        "chars": len(text),
        "preview": text[:900],
        "skills": extract_skills(text)[:30],
        "emails": sorted(set(_EMAIL.findall(text)))[:3],
        "phones": sorted(set(m.strip() for m in _PHONE.findall(text)))[:3],
    }
