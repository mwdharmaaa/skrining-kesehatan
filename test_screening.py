"""Unit tests for screening rules engine.
Tests boundary conditions and clinical classifications from the PDF.
"""

import unittest
from screening import (
    cek_suhu,
    cek_nadi,
    cek_pernapasan,
    hasil_skrining,
    evaluasi_pasien
)


class TestScreeningEngine(unittest.TestCase):
    """Test suite for vital signs triage rules."""

    def test_cek_suhu_boundaries(self):
        # Normal (< 37.5)
        self.assertEqual(cek_suhu(36.5), "Normal")
        self.assertEqual(cek_suhu(37.4), "Normal")

        # Perlu Pemantauan (37.5 <= suhu < 38.0)
        self.assertEqual(cek_suhu(37.5), "Perlu Pemantauan")
        self.assertEqual(cek_suhu(37.9), "Perlu Pemantauan")

        # Demam (>= 38.0)
        self.assertEqual(cek_suhu(38.0), "Demam")
        self.assertEqual(cek_suhu(39.2), "Demam")

    def test_cek_nadi_boundaries(self):
        # Nadi Rendah (< 60)
        self.assertEqual(cek_nadi(50), "Nadi Rendah")
        self.assertEqual(cek_nadi(59), "Nadi Rendah")

        # Nadi Normal (60 <= nadi <= 100)
        self.assertEqual(cek_nadi(60), "Nadi Normal")
        self.assertEqual(cek_nadi(80), "Nadi Normal")
        self.assertEqual(cek_nadi(100), "Nadi Normal")

        # Nadi Tinggi (> 100)
        self.assertEqual(cek_nadi(101), "Nadi Tinggi")
        self.assertEqual(cek_nadi(125), "Nadi Tinggi")

    def test_cek_pernapasan_boundaries(self):
        # Pernapasan Lambat (< 12)
        self.assertEqual(cek_pernapasan(10), "Pernapasan Lambat")
        self.assertEqual(cek_pernapasan(11), "Pernapasan Lambat")

        # Pernapasan Normal (12 <= napas <= 20)
        self.assertEqual(cek_pernapasan(12), "Pernapasan Normal")
        self.assertEqual(cek_pernapasan(16), "Pernapasan Normal")
        self.assertEqual(cek_pernapasan(20), "Pernapasan Normal")

        # Pernapasan Cepat (> 20)
        self.assertEqual(cek_pernapasan(21), "Pernapasan Cepat")
        self.assertEqual(cek_pernapasan(28), "Pernapasan Cepat")

    def test_hasil_skrining_outcomes(self):
        # 0 warnings -> Normal
        self.assertEqual(
            hasil_skrining(36.6, 75, 16),
            "Kondisi dalam batas pemantauan normal"
        )
        # 37.5 does not trigger warning count in original script (suhu >= 38 is required)
        self.assertEqual(
            hasil_skrining(37.6, 75, 16),
            "Kondisi dalam batas pemantauan normal"
        )

        # 1 warning -> Perlu pemantauan lebih lanjut
        self.assertEqual(
            hasil_skrining(38.2, 75, 16),
            "Perlu pemantauan lebih lanjut"
        )
        self.assertEqual(
            hasil_skrining(36.6, 115, 16),
            "Perlu pemantauan lebih lanjut"
        )
        self.assertEqual(
            hasil_skrining(36.6, 75, 24),
            "Perlu pemantauan lebih lanjut"
        )

        # 2 warnings -> Disarankan pemeriksaan oleh tenaga kesehatan
        self.assertEqual(
            hasil_skrining(38.5, 120, 18),
            "Disarankan pemeriksaan oleh tenaga kesehatan"
        )

        # 3 warnings -> Disarankan pemeriksaan oleh tenaga kesehatan
        self.assertEqual(
            hasil_skrining(39.0, 130, 26),
            "Disarankan pemeriksaan oleh tenaga kesehatan"
        )

    def test_evaluasi_pasien(self):
        record = evaluasi_pasien(
            nama="Ahmad Fauzi",
            umur=17,
            jenis_kelamin="L",
            suhu=38.4,
            nadi=104,
            napas=18
        )
        self.assertEqual(record["nama"], "Ahmad Fauzi")
        self.assertEqual(record["umur"], 17)
        self.assertEqual(record["status_suhu"], "Demam")
        self.assertEqual(record["status_nadi"], "Nadi Tinggi")
        self.assertEqual(record["status_napas"], "Pernapasan Normal")
        self.assertEqual(
            record["hasil"],
            "Disarankan pemeriksaan oleh tenaga kesehatan"
        )


if __name__ == "__main__":
    unittest.main()
