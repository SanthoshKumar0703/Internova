import os
import tempfile
import unittest
from unittest.mock import patch

from app.parse import parse_resume


class TestResumeGeminiIntegration(unittest.TestCase):
    def test_parse_resume_uses_gemini_when_api_key_is_present(self):
        content = "Experienced Python developer with FastAPI and React skills."
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            f.write(content)
            path = f.name

        payload = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": '{"name":"Alice Johnson","degree":"B.Tech in Computer Science","college":"NIT Trichy","year":"2026","phone":"+91 9876543210","email":"alice@example.com","skills":["Python","FastAPI","React","SQL"],"summary":"Software engineer"}'
                    }]
                }
            }]
        }

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}, clear=False):
            with patch("app.parse.requests.post") as mock_post:
                mock_post.return_value.status_code = 200
                mock_post.return_value.json.return_value = payload

                parsed = parse_resume(path, os.path.basename(path))

        self.assertEqual(parsed["name"], "Alice Johnson")
        self.assertEqual(parsed["degree"], "B.Tech in Computer Science")
        self.assertEqual(parsed["college"], "NIT Trichy")
        self.assertEqual(parsed["year"], "2026")
        self.assertEqual(parsed["email"], "alice@example.com")
        self.assertIn("Python", parsed["skills"])
        self.assertIn("FastAPI", parsed["skills"])
        self.assertIn("B.Tech in Computer Science", parsed["education"] or [])
        self.assertIn("Software Engineer", parsed["preferredRoles"] or [])

        os.unlink(path)


if __name__ == "__main__":
    unittest.main()
