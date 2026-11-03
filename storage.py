"""Patient records storage and query repository using SQLite.
Implements data persistence and statistical aggregations for blood pressure screening.
"""

import sqlite3
from typing import List, Dict, Any, Optional


class PatientRepository:
    """Thread-safe SQLite repository for patient blood pressure screening records."""

    def __init__(self, db_path: str = "patients.db"):
        self.db_path = db_path
        self._shared_conn: Optional[sqlite3.Connection] = None
        if self.db_path == ":memory:":
            self._shared_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._shared_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._shared_conn is not None:
            return self._shared_conn
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nama TEXT NOT NULL,
                    umur INTEGER NOT NULL,
                    jenis_kelamin TEXT NOT NULL,
                    sistolik INTEGER NOT NULL,
                    status_sistolik TEXT NOT NULL,
                    diastolik INTEGER NOT NULL,
                    status_diastolik TEXT NOT NULL,
                    nadi INTEGER NOT NULL,
                    status_nadi TEXT NOT NULL,
                    hasil TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def add_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO patients (
                    nama, umur, jenis_kelamin,
                    sistolik, status_sistolik,
                    diastolik, status_diastolik,
                    nadi, status_nadi,
                    hasil
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                patient_data["nama"],
                patient_data["umur"],
                patient_data["jenis_kelamin"],
                patient_data["sistolik"],
                patient_data["status_sistolik"],
                patient_data["diastolik"],
                patient_data["status_diastolik"],
                patient_data["nadi"],
                patient_data["status_nadi"],
                patient_data["hasil"]
            ))
            patient_id = cursor.lastrowid
            conn.commit()

            cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
            row = cursor.fetchone()
            return dict(row)

    def get_all_patients(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM patients ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def search_patients(self, query: str) -> List[Dict[str, Any]]:
        clean_query = f"%{query.strip().lower()}%"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM patients
                WHERE LOWER(nama) LIKE ?
                ORDER BY id DESC
            """, (clean_query,))
            return [dict(row) for row in cursor.fetchall()]

    def get_statistics(self) -> Dict[str, int]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM patients")
            total = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil = 'Tekanan Darah Normal'")
            normal = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil = 'Hipotensi (Tekanan Darah Rendah)'")
            hipotensi = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil = 'Prahipertensi (Meningkat)'")
            prahipertensi = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil = 'Hipertensi Derajat 1'")
            hipertensi_1 = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil = 'Hipertensi Derajat 2'")
            hipertensi_2 = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients WHERE hasil LIKE '%Krisis%'")
            krisis = cursor.fetchone()[0]

            return {
                "total": total,
                "normal": normal,
                "hipotensi": hipotensi,
                "prahipertensi": prahipertensi,
                "hipertensi_1": hipertensi_1,
                "hipertensi_2": hipertensi_2,
                "krisis": krisis
            }

    def delete_patient(self, patient_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
            conn.commit()
            return cursor.rowcount > 0
