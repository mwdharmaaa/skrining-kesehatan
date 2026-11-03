"""Unit tests for PatientRepository using in-memory SQLite database."""

import unittest
from storage import PatientRepository
from screening import evaluasi_pasien


class TestPatientRepository(unittest.TestCase):
    """Test suite for patient blood pressure records persistence and querying."""

    def setUp(self):
        # Use an in-memory database for isolated, lightning-fast testing
        self.repo = PatientRepository(db_path=":memory:")

    def test_add_and_get_all_patients(self):
        p1 = evaluasi_pasien("Budi Santoso", 25, "L", 115, 75, 72)
        created = self.repo.add_patient(p1)
        self.assertIsNotNone(created["id"])
        self.assertEqual(created["nama"], "Budi Santoso")
        self.assertEqual(created["status_sistolik"], "Sistolik Normal")
        self.assertEqual(created["sistolik"], 115)
        self.assertEqual(created["diastolik"], 75)

        p2 = evaluasi_pasien("Siti Rahma", 30, "P", 145, 95, 80)
        self.repo.add_patient(p2)

        patients = self.repo.get_all_patients()
        self.assertEqual(len(patients), 2)
        # Verify ordered by newest first (id descending)
        self.assertEqual(patients[0]["nama"], "Siti Rahma")
        self.assertEqual(patients[1]["nama"], "Budi Santoso")

    def test_search_patients(self):
        p1 = evaluasi_pasien("Ahmad Dahlan", 45, "L", 118, 78, 70)
        p2 = evaluasi_pasien("Ahmad Yani", 52, "L", 125, 75, 74)
        p3 = evaluasi_pasien("Dewi Sartika", 28, "P", 135, 85, 82)
        self.repo.add_patient(p1)
        self.repo.add_patient(p2)
        self.repo.add_patient(p3)

        # Case-insensitive substring search matching "ahmad"
        results = self.repo.search_patients("ahmad")
        self.assertEqual(len(results), 2)
        names = [r["nama"] for r in results]
        self.assertIn("Ahmad Dahlan", names)
        self.assertIn("Ahmad Yani", names)

        # Substring search matching "sartika"
        results = self.repo.search_patients("SARTIKA")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["nama"], "Dewi Sartika")

        # Non-matching search
        results = self.repo.search_patients("NonExistent")
        self.assertEqual(len(results), 0)

    def test_get_statistics(self):
        # Empty repo stats
        stats = self.repo.get_statistics()
        self.assertEqual(stats["total"], 0)
        self.assertEqual(stats["normal"], 0)
        self.assertEqual(stats["hipotensi"], 0)
        self.assertEqual(stats["prahipertensi"], 0)
        self.assertEqual(stats["hipertensi_1"], 0)
        self.assertEqual(stats["hipertensi_2"], 0)
        self.assertEqual(stats["krisis"], 0)

        # 1 Normal (115/75)
        self.repo.add_patient(evaluasi_pasien("Pasien Normal", 20, "L", 115, 75, 70))
        # 1 Hipotensi (85/55)
        self.repo.add_patient(evaluasi_pasien("Pasien Hipotensi", 22, "P", 85, 55, 65))
        # 1 Prahipertensi (125/75)
        self.repo.add_patient(evaluasi_pasien("Pasien Pra", 30, "L", 125, 75, 72))
        # 1 Hipertensi 1 (135/85)
        self.repo.add_patient(evaluasi_pasien("Pasien Hip1", 40, "P", 135, 85, 78))
        # 1 Hipertensi 2 (150/95)
        self.repo.add_patient(evaluasi_pasien("Pasien Hip2", 50, "L", 150, 95, 84))
        # 1 Krisis (190/125)
        self.repo.add_patient(evaluasi_pasien("Pasien Krisis", 60, "P", 190, 125, 96))

        stats = self.repo.get_statistics()
        self.assertEqual(stats["total"], 6)
        self.assertEqual(stats["normal"], 1)
        self.assertEqual(stats["hipotensi"], 1)
        self.assertEqual(stats["prahipertensi"], 1)
        self.assertEqual(stats["hipertensi_1"], 1)
        self.assertEqual(stats["hipertensi_2"], 1)
        self.assertEqual(stats["krisis"], 1)

    def test_delete_patient(self):
        p = evaluasi_pasien("Pasien Hapus", 35, "L", 118, 76, 70)
        created = self.repo.add_patient(p)
        patient_id = created["id"]

        success = self.repo.delete_patient(patient_id)
        self.assertTrue(success)
        self.assertEqual(len(self.repo.get_all_patients()), 0)

        # Deleting non-existent ID returns False
        success2 = self.repo.delete_patient(9999)
        self.assertFalse(success2)


if __name__ == "__main__":
    unittest.main()
