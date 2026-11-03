"""Web application server for Patient Health Screening.
Provides REST API endpoints and serves the responsive clinical dashboard.
"""

import json
import os
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from typing import Optional

from screening import evaluasi_pasien, cek_sistolik, cek_diastolik, cek_nadi, hasil_skrining
from storage import PatientRepository


class ScreeningRequestHandler(SimpleHTTPRequestHandler):
    """HTTP Request handler for health screening API and UI."""

    repo: PatientRepository = None
    base_dir: str = os.path.dirname(os.path.abspath(__file__))

    def _send_json(self, status_code: int, data: any) -> None:
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def _send_error_json(self, status_code: int, message: str) -> None:
        self._send_json(status_code, {"error": message})

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/patients":
            patients = self.repo.get_all_patients()
            self._send_json(200, {"data": patients, "count": len(patients)})
            return

        if path == "/api/search":
            qs = parse_qs(parsed.query)
            query = qs.get("q", [""])[0]
            results = self.repo.search_patients(query)
            self._send_json(200, {"data": results, "query": query, "count": len(results)})
            return

        if path == "/api/stats":
            stats = self.repo.get_statistics()
            self._send_json(200, stats)
            return

        # Static file and HTML serving
        if path in ("/", "/index.html"):
            file_path = os.path.join(self.base_dir, "templates", "index.html")
        elif path.startswith("/static/"):
            rel_path = path.lstrip("/")
            file_path = os.path.join(self.base_dir, rel_path)
        else:
            self._send_error_json(404, "Endpoint not found")
            return

        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self._send_error_json(404, f"File not found: {path}")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_error_json(500, f"Error reading file: {str(e)}")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._send_error_json(400, "Empty request body")
            return

        try:
            body_bytes = self.rfile.read(content_length)
            body = json.loads(body_bytes.decode("utf-8"))
        except Exception as e:
            self._send_error_json(400, f"Malformed JSON: {str(e)}")
            return

        if path == "/api/triage/preview":
            try:
                sistolik = int(body.get("sistolik", 120))
                diastolik = int(body.get("diastolik", 80))
                nadi = int(body.get("nadi", 75))
                result = {
                    "sistolik": sistolik,
                    "status_sistolik": cek_sistolik(sistolik),
                    "diastolik": diastolik,
                    "status_diastolik": cek_diastolik(diastolik),
                    "nadi": nadi,
                    "status_nadi": cek_nadi(nadi),
                    "hasil": hasil_skrining(sistolik, diastolik)
                }
                self._send_json(200, result)
            except (ValueError, TypeError) as e:
                self._send_error_json(400, f"Invalid blood pressure parameters: {str(e)}")
            return

        if path == "/api/patients":
            # Validate required fields
            nama = body.get("nama")
            umur = body.get("umur")
            jenis_kelamin = body.get("jenis_kelamin")
            sistolik = body.get("sistolik")
            diastolik = body.get("diastolik")
            nadi = body.get("nadi")

            if not nama or umur is None or not jenis_kelamin or sistolik is None or diastolik is None or nadi is None:
                self._send_error_json(400, "Missing required patient fields")
                return

            try:
                evaluated = evaluasi_pasien(
                    nama=str(nama),
                    umur=int(umur),
                    jenis_kelamin=str(jenis_kelamin),
                    sistolik=int(sistolik),
                    diastolik=int(diastolik),
                    nadi=int(nadi)
                )
                saved = self.repo.add_patient(evaluated)
                self._send_json(201, {"message": "DATA PASIEN BERHASIL DISIMPAN", "data": saved})
            except Exception as e:
                self._send_error_json(400, f"Processing error: {str(e)}")
            return

        self._send_error_json(404, "Endpoint not found")

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/patients/"):
            try:
                patient_id = int(path.split("/")[-1])
                success = self.repo.delete_patient(patient_id)
                if success:
                    self._send_json(200, {"message": f"Patient #{patient_id} deleted successfully"})
                else:
                    self._send_error_json(404, f"Patient #{patient_id} not found")
            except ValueError:
                self._send_error_json(400, "Invalid patient ID")
            return

        self._send_error_json(404, "Endpoint not found")


def create_server(host: str = "0.0.0.0", port: int = 8000, db_path: str = "patients.db") -> ThreadingHTTPServer:
    """Create and configure server instance."""
    repo = PatientRepository(db_path=db_path)

    class ConfiguredHandler(ScreeningRequestHandler):
        pass

    ConfiguredHandler.repo = repo
    server = ThreadingHTTPServer((host, port), ConfiguredHandler)
    return server


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    server = create_server("0.0.0.0", port, "patients.db")
    print(f"Server started at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
