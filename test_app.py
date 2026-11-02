"""Integration tests for web server endpoints."""

import json
import threading
import unittest
import urllib.request
import urllib.error
from app import create_server


class TestAppServer(unittest.TestCase):
    """Integration test suite for the HTTP API."""

    @classmethod
    def setUpClass(cls):
        # Bind to port 0 to let OS allocate a free random ephemeral port
        cls.server = create_server(host="127.0.0.1", port=0, db_path=":memory:")
        cls.port = cls.server.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.port}"

        # Run server in background daemon thread
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def _get_json(self, path: str):
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data)

    def _post_json(self, path: str, payload: dict):
        url = f"{self.base_url}{path}"
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data)

    def test_get_patients_and_stats(self):
        status, body = self._get_json("/api/patients")
        self.assertEqual(status, 200)
        self.assertIn("data", body)
        self.assertIsInstance(body["count"], int)

        status, stats = self._get_json("/api/stats")
        self.assertEqual(status, 200)
        self.assertIn("total", stats)
        self.assertIn("normal", stats)
        self.assertIn("pemantauan", stats)
        self.assertIn("pemeriksaan", stats)

    def test_create_patient(self):
        new_patient = {
            "nama": "Test Pasien Baru",
            "umur": 19,
            "jenis_kelamin": "L",
            "suhu": 38.8,
            "nadi": 112,
            "napas": 24
        }
        status, body = self._post_json("/api/patients", new_patient)
        self.assertEqual(status, 201)
        self.assertEqual(body["message"], "DATA PASIEN BERHASIL DISIMPAN")
        data = body["data"]
        self.assertEqual(data["nama"], "Test Pasien Baru")
        self.assertEqual(data["status_suhu"], "Demam")
        self.assertEqual(data["status_nadi"], "Nadi Tinggi")
        self.assertEqual(data["status_napas"], "Pernapasan Cepat")
        self.assertEqual(data["hasil"], "Disarankan pemeriksaan oleh tenaga kesehatan")

    def test_search_patients(self):
        self._post_json("/api/patients", {
            "nama": "Siti Nurhaliza",
            "umur": 16,
            "jenis_kelamin": "P",
            "suhu": 37.0,
            "nadi": 78,
            "napas": 16
        })
        status, body = self._get_json("/api/search?q=Nurhaliza")
        self.assertEqual(status, 200)
        self.assertGreaterEqual(body["count"], 1)
        names = [p["nama"] for p in body["data"]]
        self.assertIn("Siti Nurhaliza", names)

    def test_preview_triage(self):
        payload = {"suhu": 37.6, "nadi": 78, "napas": 16}
        status, body = self._post_json("/api/triage/preview", payload)
        self.assertEqual(status, 200)
        self.assertEqual(body["status_suhu"], "Perlu Pemantauan")
        self.assertEqual(body["status_nadi"], "Nadi Normal")
        self.assertEqual(body["status_napas"], "Pernapasan Normal")
        self.assertEqual(body["hasil"], "Kondisi dalam batas pemantauan normal")

    def test_delete_patient(self):
        # Create a patient to delete
        _, created = self._post_json("/api/patients", {
            "nama": "Pasien Yang Dihapus",
            "umur": 21,
            "jenis_kelamin": "P",
            "suhu": 36.5,
            "nadi": 70,
            "napas": 16
        })
        pid = created["data"]["id"]

        del_url = f"{self.base_url}/api/patients/{pid}"
        req = urllib.request.Request(del_url, method="DELETE")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)

    def test_serve_html_and_static_files(self):
        # Test root HTML serving
        req = urllib.request.Request(f"{self.base_url}/")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            self.assertIn("text/html", resp.headers.get("Content-Type", ""))
            html_content = resp.read().decode("utf-8")
            self.assertIn("Sistem Skrining Kesehatan Pasien", html_content)

        # Test CSS serving
        req_css = urllib.request.Request(f"{self.base_url}/static/css/style.css")
        with urllib.request.urlopen(req_css) as resp:
            self.assertEqual(resp.status, 200)
            self.assertIn("text/css", resp.headers.get("Content-Type", ""))

        # Test JS serving
        req_js = urllib.request.Request(f"{self.base_url}/static/js/app.js")
        with urllib.request.urlopen(req_js) as resp:
            self.assertEqual(resp.status, 200)
            self.assertTrue(
                "javascript" in resp.headers.get("Content-Type", "")
                or "application" in resp.headers.get("Content-Type", "")
            )


if __name__ == "__main__":
    unittest.main()
