import unittest

from app.main import _latest_student_resume
from app.store import store


class TestApplicationResumeAttachment(unittest.TestCase):
    def test_latest_student_resume_returns_most_recent_upload(self):
        store.col("resumes").delete_many({})
        store.col("resumes").insert_one({
            "_id": "r_old",
            "userId": "u_student",
            "filename": "old.pdf",
            "url": "/api/files/old.pdf",
            "createdAt": "2025-01-01T00:00:00+00:00",
        })
        store.col("resumes").insert_one({
            "_id": "r_new",
            "userId": "u_student",
            "filename": "new.pdf",
            "url": "/api/files/new.pdf",
            "createdAt": "2025-01-02T00:00:00+00:00",
        })

        latest = _latest_student_resume("u_student")
        self.assertEqual(latest["_id"], "r_new")
        self.assertEqual(latest["filename"], "new.pdf")


if __name__ == "__main__":
    unittest.main()
