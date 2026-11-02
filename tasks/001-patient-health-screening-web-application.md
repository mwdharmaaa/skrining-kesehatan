---
id: "001"
title: "Patient Health Screening Web Application"
type: "feature"
status: "done"
created_at: "2026-11-02"
updated_at: "2026-11-02"
---

# [Feature] Patient Health Screening Web Application

## Description
Transform the Python health screening script from Aplikasi_Skrining_Kesehatan_Pasien.pdf (SMK Kesehatan) into a production-grade Python web application with real-time vital sign triage, patient registration, searchable record grid, and aggregate statistics.

## Acceptance Criteria
- [x] Core medical screening functions (cek_suhu, cek_nadi, cek_pernapasan, hasil_skrining) with 100% boundary test coverage
- [x] In-memory and SQLite repository for patient records and statistics
- [x] FastAPI web backend with endpoints matching the original CLI menus
- [x] Responsive web UI with real-time triage calculator, patient form, searchable table, and statistics cards
- [x] Single-enter shell bundle (test.sh, deploy.sh) and automated verification tests passing

## Context / Notes
- Reference document: .aicodeeditor_attachments/Aplikasi_Skrining_Kesehatan_Pasien.pdf
- Design: Pure Crisp Monochrome Light palette (#ffffff canvas, 1px neutral hairline borders, #111111 buttons)
- Stack: Python (FastAPI, Uvicorn, Jinja2/Static), pytest, HTML5/CSS/Vanilla JS
