from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

# Ensure environment variables are available before auth imports read them.
os.environ.setdefault("GOOGLE_CLIENT_ID", os.getenv("GOOGLE_CLIENT_ID", ""))
                   
