"""Core patient health screening and triage rules engine.
Ported from Aplikasi_Skrining_Kesehatan_Pasien.pdf (SMK Kesehatan).
"""

from typing import Dict, Any


def cek_suhu(suhu: float) -> str:
    """Determine temperature category."""
    if suhu >= 38.0:
        return "Demam"
    elif suhu >= 37.5:
        return "Perlu Pemantauan"
    else:
        return "Normal"


def cek_nadi(nadi: int) -> str:
    """Determine pulse rate category."""
    if nadi < 60:
        return "Nadi Rendah"
    elif nadi <= 100:
        return "Nadi Normal"
    else:
        return "Nadi Tinggi"


def cek_pernapasan(napas: int) -> str:
    """Determine respiratory rate category."""
    if napas < 12:
        return "Pernapasan Lambat"
    elif napas <= 20:
        return "Pernapasan Normal"
    else:
        return "Pernapasan Cepat"


def hasil_skrining(suhu: float, nadi: int, napas: int) -> str:
    """Determine overall clinical screening outcome."""
    jumlah_peringatan = 0
    if suhu >= 38.0:
        jumlah_peringatan += 1
    if nadi < 60 or nadi > 100:
        jumlah_peringatan += 1
    if napas < 12 or napas > 20:
        jumlah_peringatan += 1

    if jumlah_peringatan == 0:
        return "Kondisi dalam batas pemantauan normal"
    elif jumlah_peringatan == 1:
        return "Perlu pemantauan lebih lanjut"
    else:
        return "Disarankan pemeriksaan oleh tenaga kesehatan"


def evaluasi_pasien(
    nama: str,
    umur: int,
    jenis_kelamin: str,
    suhu: float,
    nadi: int,
    napas: int
) -> Dict[str, Any]:
    """Evaluate patient vital signs and build complete patient record."""
    status_suhu = cek_suhu(suhu)
    status_nadi = cek_nadi(nadi)
    status_napas = cek_pernapasan(napas)
    skrining = hasil_skrining(suhu, nadi, napas)

    # Standardize gender display
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
        "suhu": round(float(suhu), 1),
        "status_suhu": status_suhu,
        "nadi": int(nadi),
        "status_nadi": status_nadi,
        "napas": int(napas),
        "status_napas": status_napas,
        "hasil": skrining
    }
