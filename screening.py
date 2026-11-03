"""Core patient blood pressure screening and clinical classification rules engine.
Ported from skrining_tekanan_darah.py.
"""

from typing import Dict, Any


def cek_sistolik(sistolik: int) -> str:
    """Determine systolic blood pressure category."""
    if sistolik >= 180:
        return "Sistolik Krisis (Sangat Tinggi)"
    elif sistolik >= 140:
        return "Sistolik Tinggi (Hipertensi Derajat 2)"
    elif sistolik >= 130:
        return "Sistolik Tinggi (Hipertensi Derajat 1)"
    elif sistolik >= 120:
        return "Sistolik Meningkat (Prahipertensi)"
    elif sistolik >= 90:
        return "Sistolik Normal"
    else:
        return "Sistolik Rendah (Hipotensi)"


def cek_diastolik(diastolik: int) -> str:
    """Determine diastolic blood pressure category."""
    if diastolik >= 120:
        return "Diastolik Krisis (Sangat Tinggi)"
    elif diastolik >= 90:
        return "Diastolik Tinggi (Hipertensi Derajat 2)"
    elif diastolik >= 80:
        return "Diastolik Tinggi (Hipertensi Derajat 1)"
    elif diastolik >= 60:
        return "Diastolik Normal"
    else:
        return "Diastolik Rendah (Hipotensi)"


def cek_nadi(nadi: int) -> str:
    """Determine resting pulse rate category."""
    if nadi < 60:
        return "Nadi Rendah"
    elif nadi <= 100:
        return "Nadi Normal"
    else:
        return "Nadi Tinggi"


def hasil_skrining(sistolik: int, diastolik: int) -> str:
    """Determine blood pressure clinical classification outcome."""
    if sistolik >= 180 or diastolik >= 120:
        return "Krisis Hipertensi (Bahaya - Perlu Tindakan Darurat)"
    elif sistolik >= 140 or diastolik >= 90:
        return "Hipertensi Derajat 2"
    elif sistolik >= 130 or diastolik >= 80:
        return "Hipertensi Derajat 1"
    elif sistolik >= 120 and diastolik < 80:
        return "Prahipertensi (Meningkat)"
    elif sistolik < 90 or diastolik < 60:
        return "Hipotensi (Tekanan Darah Rendah)"
    else:
        return "Tekanan Darah Normal"


def evaluasi_pasien(
    nama: str,
    umur: int,
    jenis_kelamin: str,
    sistolik: int,
    diastolik: int,
    nadi: int
) -> Dict[str, Any]:
    """Evaluate patient blood pressure parameters and return structured record."""
    status_sistolik = cek_sistolik(sistolik)
    status_diastolik = cek_diastolik(diastolik)
    status_nadi = cek_nadi(nadi)
    skrining = hasil_skrining(sistolik, diastolik)

    jk_clean = jenis_kelamin.strip().upper()
    if jk_clean in ("L", "LAKI-LAKI", "MALE", "M"):
        gender_label = "Laki-laki (L)"
    elif jk_clean in ("P", "PEREMPUAN", "FEMALE", "F"):
        gender_label = "Perempuan (P)"
    else:
        gender_label = jenis_kelamin.strip()

    return {
        "nama": nama.strip(),
        "umur": int(umur),
        "jenis_kelamin": gender_label,
        "sistolik": int(sistolik),
        "status_sistolik": status_sistolik,
        "diastolik": int(diastolik),
        "status_diastolik": status_diastolik,
        "nadi": int(nadi),
        "status_nadi": status_nadi,
        "hasil": skrining
    }
