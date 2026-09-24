import os
import tempfile
import unittest

from app.parse import parse_resume


class TestResumeProfileExtraction(unittest.TestCase):
    def test_parse_resume_extracts_profile_fields(self):
        text = """
        Sanjay Kumar
        B.Tech Computer Science and Engineering
        VIT Vellore | 2026
        +91 9876543210
        sanjay@example.com
        Skills: Python, React, SQL, Docker
        """
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            f.write(text)
            path = f.name
        try:
            parsed = parse_resume(path, os.path.basename(path))
            self.assertEqual(parsed.get("name"), "Sanjay Kumar")
            self.assertIn("Computer Science", parsed.get("degree", ""))
            self.assertIn("Python", parsed.get("skills", []))
            self.assertIn("sanjay@example.com", parsed.get("emails", []))
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
