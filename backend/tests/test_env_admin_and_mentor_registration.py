import os
import unittest

from app.main import RegisterIn, register
from app.store import seed_if_empty, store


class TestEnvAdminAndMentorRegistration(unittest.TestCase):
    def setUp(self):
        os.environ["ADMIN_EMAIL"] = "admin@custom.local"
        os.environ["ADMIN_PASSWORD"] = "custompass123"
        store._mem = {}
        store.col("users").delete_one({"email": "mentor@custom.local"})
        store.col("users").delete_one({"email": "admin@custom.local"})

    def test_seed_if_empty_uses_env_admin_credentials(self):
        seed_if_empty()
        admin = store.col("users").find_one({"role": "admin"})
        self.assertIsNotNone(admin)
        self.assertEqual(admin["email"], "admin@custom.local")
        self.assertTrue(admin["passwordHash"])

    def test_public_registration_allows_mentor(self):
        resp = register(RegisterIn(
            name="Mentor Test",
            email="mentor@custom.local",
            password="demo1234",
            role="mentor",
        ))
        self.assertEqual(resp["user"]["role"], "mentor")
        self.assertEqual(resp["user"]["email"], "mentor@custom.local")


if __name__ == "__main__":
    unittest.main()
