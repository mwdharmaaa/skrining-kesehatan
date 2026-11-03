# Patient Blood Pressure Screening Web Application

A web-based clinical triage and blood pressure screening system ported from `skrining_tekanan_darah.py`.

## Clinical Blood Pressure Decision Matrix

The screening algorithm classifies systolic pressure, diastolic pressure, and resting pulse rate to compute the final clinical diagnosis category.

### 1. Blood Pressure Parameters

| Parameter | Range | Classification |
|---|---|---|
| **Systolic Pressure (mmHg)** | < 90 | Sistolik Rendah (Hipotensi) |
| | 90 - 119 | Sistolik Normal |
| | 120 - 129 | Sistolik Meningkat (Prahipertensi) |
| | 130 - 139 | Sistolik Tinggi (Hipertensi Derajat 1) |
| | 140 - 179 | Sistolik Tinggi (Hipertensi Derajat 2) |
| | >= 180 | Sistolik Krisis (Sangat Tinggi) |
| **Diastolic Pressure (mmHg)** | < 60 | Diastolik Rendah (Hipotensi) |
| | 60 - 79 | Diastolik Normal |
| | 80 - 89 | Diastolik Tinggi (Hipertensi Derajat 1) |
| | 90 - 119 | Diastolik Tinggi (Hipertensi Derajat 2) |
| | >= 120 | Diastolik Krisis (Sangat Tinggi) |
| **Pulse Rate (bpm)** | < 60 | Nadi Rendah |
| | 60 - 100 | Nadi Normal |
| | > 100 | Nadi Tinggi |

### 2. Overall Clinical Screening Outcome

| Criteria | Final Outcome |
|---|---|
| Sistolik >= 180 OR Diastolik >= 120 | **Krisis Hipertensi (Bahaya - Perlu Tindakan Darurat)** |
| Sistolik >= 140 OR Diastolik >= 90 | **Hipertensi Derajat 2** |
| Sistolik >= 130 OR Diastolik >= 80 | **Hipertensi Derajat 1** |
| Sistolik >= 120 AND Diastolik < 80 | **Prahipertensi (Meningkat)** |
| Sistolik < 90 OR Diastolik < 60 | **Hipotensi (Tekanan Darah Rendah)** |
| In all other standard ranges | **Tekanan Darah Normal** |

---

## Architectural Overview

The application is structured into decoupled, single-responsibility modules:

- `screening.py`: Pure, zero-dependency Python module implementing triage evaluation (`cek_sistolik`, `cek_diastolik`, `cek_nadi`, `hasil_skrining`, `evaluasi_pasien`).
- `storage.py`: Thread-safe SQLite repository supporting in-memory testing and file persistence (`patients.db`) with case-insensitive search and aggregate statistical queries.
- `app.py`: Standard library HTTP server with REST endpoints and static file serving.
- `templates/index.html`: Responsive dashboard UI following the Pure Crisp Monochrome Light design system.
- `static/css/style.css`: Clean, neutral styling with high contrast readability and clinical stage badges.
- `static/js/app.js`: Real-time blood pressure badges, debounced search, custom in-app confirm modal, CSV export, and detail modal.

---

## API Endpoints

- `GET /api/patients`: Retrieve all registered patient blood pressure screening records.
- `POST /api/patients`: Create a new record with automatic blood pressure classification computation.
- `GET /api/search?q=:name`: Case-insensitive substring search matching patient name.
- `GET /api/stats`: Retrieve aggregate counts for total, normal, hipotensi, prahipertensi, hipertensi 1, hipertensi 2, and krisis.
- `POST /api/triage/preview`: Calculate blood pressure categories in real time without persisting.
- `DELETE /api/patients/:id`: Delete a patient record by ID.

---

## Quick Start

### 1. Run Tests
```bash
python3 -m unittest discover -p "test_*.py"
```

### 2. Start Application Locally
```bash
python3 app.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### 3. Deploy via Docker
```bash
./deploy.sh
```
Or redeploy with:
```bash
./redeploy.sh
```
