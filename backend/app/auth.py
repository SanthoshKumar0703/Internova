from __future__ import annotations
import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path

import jwt
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

JWT_SECRET = os.getenv("JWT_SECRET", "internova-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_SECONDS = 7 * 24 * 3600
DEV_OTP = os.getenv("DEV_OTP", "true").lower() == "true"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

                                                                         
OTPS: dict[str, dict] = {}                                    
RESETS: dict[str, dict] = {}                              


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, hexd = hashed.split("$", 1)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
        return hmac.compare_digest(dk.hex(), hexd)
    except Exception:
        return False


def make_token(uid: str, role: str) -> str:
    return jwt.encode(
        {"sub": uid, "role": role, "exp": int(time.time()) + JWT_EXP_SECONDS},
        JWT_SECRET,
        algorithm=JWT_ALG,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def issue_otp(uid: str) -> tuple[str, str]:
    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    tmp = secrets.token_urlsafe(24)
    OTPS[tmp] = {"otp": otp, "uid": uid, "exp": time.time() + 300}
    return tmp, otp


def check_otp(tmp: str, otp: str) -> str | None:
    rec = OTPS.get(tmp)
    if not rec or rec["exp"] < time.time():
        OTPS.pop(tmp, None)
        return None
    if not hmac.compare_digest(str(rec["otp"]), str(otp).strip()):
        return None
    OTPS.pop(tmp, None)
    return rec["uid"]


def issue_reset(uid: str) -> str:
    tok = secrets.token_urlsafe(32)
    RESETS[tok] = {"uid": uid, "exp": time.time() + 3600}
    return tok


def check_reset(tok: str) -> str | None:
    rec = RESETS.get(tok)
    if not rec or rec["exp"] < time.time():
        RESETS.pop(tok, None)
        return None
    RESETS.pop(tok, None)
    return rec["uid"]


def verify_google_credential(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID is not configured on the server")
    try:
        from google.auth import exceptions as google_exceptions
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as e:
        raise ValueError("Google authentication dependencies are missing on the server") from e

    try:
        idinfo = google_id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except google_exceptions.GoogleAuthError as e:
        raise ValueError(f"Could not verify Google credential: {e}") from e
    except Exception as e:
        raise ValueError("Malformed Google credential") from e
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid token issuer")
    if not idinfo.get("email") or not idinfo.get("email_verified"):
        raise ValueError("Google account email is not verified")
    return idinfo
