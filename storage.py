"""Patient records storage and query repository using SQLite.
Implements data persistence and statistical aggregations for health screening.
"""

import sqlite3
from typing import List, Dict, Any, Optional


class PatientRepository:
    """Thread-safe SQLite repository for patient screening records."""

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
                    suhu REAL NOT NULL,
                    status_suhu TEXT NOT NULL,
                    nadi INTEGER NOT NULL,
                    status_nadi TEXT NOT NULL,
                    napas INTEGER NOT NULL,
                    status_napas TEXT NOT NULL,
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
                    suhu, status_suhu,
                    nadi, status_nadi,
                    napas, status_napas,
                    hasil
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                patient_data["nama"],
                patient_data["umur"],
                patient_data["jenis_kelamin"],
                patient_data["suhu"],
                patient_data["status_suhu"],
                patient_data["nadi"],
                patient_data["status_nadi"],
                patient_data["napas"],
                patient_data["status_napas"],
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

            cursor.execute(
                "SELECT COUNT(*) FROM patients WHERE hasil = 'Kondisi dalam batas pemantauan normal'"
            )
            normal = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM patients WHERE hasil = 'Perlu pemantauan lebih lanjut'"
            )
            pemantauan = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM patients WHERE hasil = 'Disarankan pemeriksaan oleh tenaga kesehatan'"
            )
            pemeriksaan = cursor.fetchone()[0]

            return {
                "total": total,
                "normal": normal,
                "pemantauan": pemantauan,
                "pemeriksaan": pemeriksaan
            }

    def delete_patient(self, patient_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
            conn.commit()
            return cursor.rowcount > 0
