"""Unit tests for blood pressure screening rules engine.
Tests boundary conditions and clinical classifications from skrining_tekanan_darah.py.
"""

import unittest
from screening import (
    cek_sistolik,
    cek_diastolik,
    cek_nadi,
    hasil_skrining,
    evaluasi_pasien
)


class TestBloodPressureScreening(unittest.TestCase):
    """Test suite for blood pressure classification rules."""

    def test_cek_sistolik_boundaries(self):
        # Hipotensi (< 90)
        self.assertEqual(cek_sistolik(80), "Sistolik Rendah (Hipotensi)")
        self.assertEqual(cek_sistolik(89), "Sistolik Rendah (Hipotensi)")

        # Normal (90 <= sistolik < 120)
        self.assertEqual(cek_sistolik(90), "Sistolik Normal")
        self.assertEqual(cek_sistolik(119), "Sistolik Normal")

        # Prahipertensi (120 <= sistolik < 130)
        self.assertEqual(cek_sistolik(120), "Sistolik Meningkat (Prahipertensi)")
        self.assertEqual(cek_sistolik(129), "Sistolik Meningkat (Prahipertensi)")

        # Hipertensi Derajat 1 (130 <= sistolik < 140)
        self.assertEqual(cek_sistolik(130), "Sistolik Tinggi (Hipertensi Derajat 1)")
        self.assertEqual(cek_sistolik(139), "Sistolik Tinggi (Hipertensi Derajat 1)")

        # Hipertensi Derajat 2 (140 <= sistolik < 180)
        self.assertEqual(cek_sistolik(140), "Sistolik Tinggi (Hipertensi Derajat 2)")
        self.assertEqual(cek_sistolik(179), "Sistolik Tinggi (Hipertensi Derajat 2)")

        # Krisis (>= 180)
        self.assertEqual(cek_sistolik(180), "Sistolik Krisis (Sangat Tinggi)")
        self.assertEqual(cek_sistolik(210), "Sistolik Krisis (Sangat Tinggi)")

    def test_cek_diastolik_boundaries(self):
        # Hipotensi (< 60)
        self.assertEqual(cek_diastolik(55), "Diastolik Rendah (Hipotensi)")
        self.assertEqual(cek_diastolik(59), "Diastolik Rendah (Hipotensi)")

        # Normal (60 <= diastolik < 80)
        self.assertEqual(cek_diastolik(60), "Diastolik Normal")
        self.assertEqual(cek_diastolik(79), "Diastolik Normal")

        # Hipertensi Derajat 1 (80 <= diastolik < 90)
        self.assertEqual(cek_diastolik(80), "Diastolik Tinggi (Hipertensi Derajat 1)")
        self.assertEqual(cek_diastolik(89), "Diastolik Tinggi (Hipertensi Derajat 1)")

        # Hipertensi Derajat 2 (90 <= diastolik < 120)
        self.assertEqual(cek_diastolik(90), "Diastolik Tinggi (Hipertensi Derajat 2)")
        self.assertEqual(cek_diastolik(119), "Diastolik Tinggi (Hipertensi Derajat 2)")

        # Krisis (>= 120)
        self.assertEqual(cek_diastolik(120), "Diastolik Krisis (Sangat Tinggi)")
        self.assertEqual(cek_diastolik(135), "Diastolik Krisis (Sangat Tinggi)")

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

    def test_hasil_skrining_outcomes(self):
        # Krisis Hipertensi (sistolik >= 180 or diastolik >= 120)
        self.assertEqual(
            hasil_skrining(185, 80),
            "Krisis Hipertensi (Bahaya - Perlu Tindakan Darurat)"
        )
        self.assertEqual(
            hasil_skrining(130, 125),
            "Krisis Hipertensi (Bahaya - Perlu Tindakan Darurat)"
        )

        # Hipertensi Derajat 2 (sistolik >= 140 or diastolik >= 90)
        self.assertEqual(
            hasil_skrining(145, 75),
            "Hipertensi Derajat 2"
        )
        self.assertEqual(
            hasil_skrining(125, 95),
            "Hipertensi Derajat 2"
        )

        # Hipertensi Derajat 1 (sistolik >= 130 or diastolik >= 80)
        self.assertEqual(
            hasil_skrining(132, 75),
            "Hipertensi Derajat 1"
        )
        self.assertEqual(
            hasil_skrining(118, 85),
            "Hipertensi Derajat 1"
        )

        # Prahipertensi (sistolik >= 120 and diastolik < 80)
        self.assertEqual(
            hasil_skrining(122, 70),
            "Prahipertensi (Meningkat)"
        )

        # Hipotensi (sistolik < 90 or diastolik < 60)
        self.assertEqual(
            hasil_skrining(85, 70),
            "Hipotensi (Tekanan Darah Rendah)"
        )
        self.assertEqual(
            hasil_skrining(100, 55),
            "Hipotensi (Tekanan Darah Rendah)"
        )

        # Tekanan Darah Normal
        self.assertEqual(
            hasil_skrining(115, 75),
            "Tekanan Darah Normal"
        )

    def test_evaluasi_pasien(self):
        record = evaluasi_pasien(
            nama="Budi Santoso",
            umur=45,
            jenis_kelamin="L",
            sistolik=142,
            diastolik=92,
            nadi=78
        )
        self.assertEqual(record["nama"], "Budi Santoso")
        self.assertEqual(record["umur"], 45)
        self.assertEqual(record["jenis_kelamin"], "Laki-laki (L)")
        self.assertEqual(record["sistolik"], 142)
        self.assertEqual(record["status_sistolik"], "Sistolik Tinggi (Hipertensi Derajat 2)")
        self.assertEqual(record["diastolik"], 92)
        self.assertEqual(record["status_diastolik"], "Diastolik Tinggi (Hipertensi Derajat 2)")
        self.assertEqual(record["nadi"], 78)
        self.assertEqual(record["status_nadi"], "Nadi Normal")
        self.assertEqual(record["hasil"], "Hipertensi Derajat 2")
