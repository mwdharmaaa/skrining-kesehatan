# Patient Health Screening Web Application

A web-based clinical triage and vital signs screening system ported from the vocational healthcare curriculum script (*Koding dan Kecerdasan Artifisial, Kelas XI Fase F Awal SMK Kesehatan*).

## Clinical Triage Decision Matrix

The screening algorithm classifies three key vital sign parameters and computes an aggregated risk score.

### 1. Vital Sign Parameters

| Parameter | Range | Classification | Clinical Indication |
|---|---|---|---|
| **Body Temperature** | < 37.5 °C | Normal | Afebrile baseline |
| | 37.5 °C - 37.9 °C | Perlu Pemantauan | Low-grade elevation |
| | >= 38.0 °C | Demam | Febrile state (Triggers +1 warning) |
| **Pulse Rate** | < 60 bpm | Nadi Rendah | Bradycardia (Triggers +1 warning) |
| | 60 - 100 bpm | Nadi Normal | Normal resting pulse |
| | > 100 bpm | Nadi Tinggi | Tachycardia (Triggers +1 warning) |
| **Respiratory Rate** | < 12 breaths/min | Pernapasan Lambat | Bradypnea (Triggers +1 warning) |
| | 12 - 20 breaths/min | Pernapasan Normal | Normal respiratory baseline |
| | > 20 breaths/min | Pernapasan Cepat | Tachypnea (Triggers +1 warning) |

### 2. Overall Triage Outcome

| Warning Points | Final Triage Category | Recommendation |
|---|---|---|
| **0 points** | Kondisi dalam batas pemantauan normal | Routine observation |
| **1 point** | Perlu pemantauan lebih lanjut | Focused monitoring within clinic |
| **>= 2 points** | Disarankan pemeriksaan oleh tenaga kesehatan | Clinical escalation / medical doctor examination |

---

## Architectural Overview

The application is structured into decoupled, single-responsibility modules:

- `screening.py`: Pure, zero-dependency Python module implementing triage evaluation (`cek_suhu`, `cek_nadi`, `cek_pernapasan`, `hasil_skrining`, `evaluasi_pasien`).
- `storage.py`: Thread-safe SQLite repository supporting in-memory testing and file persistence (`patients.db`) with case-insensitive search and aggregate statistical queries.
- `app.py`: Standard library HTTP server with REST endpoints and static file serving.
- `templates/index.html`: Responsive dashboard UI following the Pure Crisp Monochrome Light design system.
- `static/css/style.css`: Clean, neutral grayscale styling with high contrast readability.
- `static/js/app.js`: Real-time vital sign badges, debounced search, CSV export, and detail modal.

---

## API Endpoints

- `GET /api/patients`: Retrieve all registered patient screening records.
- `POST /api/patients`: Create a new record with automatic vital sign triage computation.
- `GET /api/search?q=:name`: Case-insensitive substring search matching patient name.
- `GET /api/stats`: Retrieve aggregate counts for total, normal, monitoring, and medical check.
- `POST /api/triage/preview`: Calculate vital categories in real time without persisting.
- `DELETE /api/patients/:id`: Delete a patient record by ID.

---

## Quick Start

### 1. Run Tests
```bash
./test.sh
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
