---
id: "002"
title: "Fix client triage script and sync to GitHub"
type: "bugfix"
status: "done"
created_at: "2026-11-02"
updated_at: "2026-11-02"
---

# [Bugfix] Fix client triage script and sync to GitHub

## Description
Restore and validate clean client-side triage script (static/js/app.js) with reactive input handling (cekSuhu >= 38 Demam, cekNadi, cekPernapasan), dual-mode SQLite and offline localStorage persistence, verify all tests pass, and sync commits to GitHub remote.

## Acceptance Criteria
- [x] Restore clean static/js/app.js with valid JS syntax and reactive triage calculations
- [x] Verify node syntax check passes for static/js/app.js
- [x] Verify test suite ./test.sh passes (15 unit and integration tests)
- [x] Test offline localStorage and server API modes
- [x] Push clean commits to GitHub remote branches devv and main

## Context / Notes
- Target files: 
- Dependencies: None
