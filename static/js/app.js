/**
 * Patient Health Screening Application (Frontend)
 * Implements real-time vital sign triage, patient registration,
 * searchable datagrid, live statistics, and dual-mode persistence (API + LocalStorage).
 */

// ==============================================================================
// CLINICAL TRIAGE RULES ENGINE (Exact parity with Python screening.py)
// ==============================================================================

function cekSuhu(suhu) {
  const val = parseFloat(suhu);
  if (isNaN(val)) return { label: "Normal", cls: "status-normal" };
  if (val >= 38.0) return { label: "Demam", cls: "status-danger" };
  if (val >= 37.5) return { label: "Perlu Pemantauan", cls: "status-warning" };
  return { label: "Normal", cls: "status-normal" };
}

function cekNadi(nadi) {
  const val = parseInt(nadi, 10);
  if (isNaN(val)) return { label: "Nadi Normal", cls: "status-normal" };
  if (val < 60) return { label: "Nadi Rendah", cls: "status-warning" };
  if (val <= 100) return { label: "Nadi Normal", cls: "status-normal" };
  return { label: "Nadi Tinggi", cls: "status-danger" };
}

function cekPernapasan(napas) {
  const val = parseInt(napas, 10);
  if (isNaN(val)) return { label: "Pernapasan Normal", cls: "status-normal" };
  if (val < 12) return { label: "Pernapasan Lambat", cls: "status-warning" };
  if (val <= 20) return { label: "Pernapasan Normal", cls: "status-normal" };
  return { label: "Pernapasan Cepat", cls: "status-danger" };
}

function hasilSkrining(suhu, nadi, napas) {
  const s = parseFloat(suhu);
  const nd = parseInt(nadi, 10);
  const np = parseInt(napas, 10);

  let warning = 0;
  if (!isNaN(s) && s >= 38.0) warning++;
  if (!isNaN(nd) && (nd < 60 || nd > 100)) warning++;
  if (!isNaN(np) && (np < 12 || np > 20)) warning++;

  if (warning === 0) {
    return {
      label: "Kondisi dalam batas pemantauan normal",
      cls: "status-normal"
    };
  }
  if (warning === 1) {
    return {
      label: "Perlu pemantauan lebih lanjut",
      cls: "status-warning"
    };
  }
  return {
    label: "Disarankan pemeriksaan oleh tenaga kesehatan",
    cls: "status-danger"
  };
}

function computeLocalStats(patients) {
  let total = (patients || []).length;
  let normal = 0;
  let pemantauan = 0;
  let pemeriksaan = 0;

  (patients || []).forEach((p) => {
    if (p.hasil === "Kondisi dalam batas pemantauan normal") normal++;
    else if (p.hasil === "Perlu pemantauan lebih lanjut") pemantauan++;
    else if (p.hasil === "Disarankan pemeriksaan oleh tenaga kesehatan") pemeriksaan++;
  });

  return { total, normal, pemantauan, pemeriksaan };
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Module export for testing environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cekSuhu,
    cekNadi,
    cekPernapasan,
    hasilSkrining,
    computeLocalStats,
    escapeHtml
  };
}

// ==============================================================================
// BROWSER CLIENT RUNTIME
// ==============================================================================

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    // Application State
    let allPatients = [];
    let isOfflineMode = false;
    let debounceTimer = null;

    const STORAGE_KEY = "skrining_kesehatan_patients_v1";

    // DOM Elements
    const statsTotal = document.getElementById("stats-total");
    const statsNormal = document.getElementById("stats-normal");
    const statsPemantauan = document.getElementById("stats-pemantauan");
    const statsPemeriksaan = document.getElementById("stats-pemeriksaan");

    const patientForm = document.getElementById("patient-form");
    const inputNama = document.getElementById("input-nama");
    const inputUmur = document.getElementById("input-umur");
    const inputGender = document.getElementById("input-gender");
    const inputSuhu = document.getElementById("input-suhu");
    const inputNadi = document.getElementById("input-nadi");
    const inputNapas = document.getElementById("input-napas");

    const badgeSuhu = document.getElementById("badge-suhu");
    const badgeNadi = document.getElementById("badge-nadi");
    const badgeNapas = document.getElementById("badge-napas");
    const badgeSummary = document.getElementById("badge-skrining-summary");

    const searchInput = document.getElementById("search-input");
    const filterStatus = document.getElementById("filter-status");
    const tableBody = document.getElementById("table-body");
    const emptyState = document.getElementById("empty-state");

    const btnReset = document.getElementById("btn-reset");
    const btnExportCsv = document.getElementById("btn-export-csv");
    const btnScrollForm = document.getElementById("btn-scroll-form");

    const detailModal = document.getElementById("detail-modal");
    const modalContent = document.getElementById("modal-content");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnDismissModal = document.getElementById("btn-dismiss-modal");
    const btnPrintModal = document.getElementById("btn-print-modal");
    const toast = document.getElementById("toast");

    // Reactive Live Triage Calculation
    function updateLiveTriage() {
      const suhuRaw = inputSuhu ? inputSuhu.value : "36.5";
      const nadiRaw = inputNadi ? inputNadi.value : "75";
      const napasRaw = inputNapas ? inputNapas.value : "16";

      const resSuhu = cekSuhu(suhuRaw);
      const resNadi = cekNadi(nadiRaw);
      const resNapas = cekPernapasan(napasRaw);
      const resSummary = hasilSkrining(suhuRaw, nadiRaw, napasRaw);

      if (badgeSuhu) {
        badgeSuhu.textContent = resSuhu.label;
        badgeSuhu.className = `status-pill ${resSuhu.cls}`;
      }
      if (badgeNadi) {
        badgeNadi.textContent = resNadi.label;
        badgeNadi.className = `status-pill ${resNadi.cls}`;
      }
      if (badgeNapas) {
        badgeNapas.textContent = resNapas.label;
        badgeNapas.className = `status-pill ${resNapas.cls}`;
      }
      if (badgeSummary) {
        badgeSummary.textContent = resSummary.label;
        badgeSummary.className = `triage-preview-value ${resSummary.cls}`;
      }
    }

    // Bind reactive listeners to vital sign inputs
    [inputSuhu, inputNadi, inputNapas].forEach((inputEl) => {
      if (inputEl) {
        inputEl.addEventListener("input", updateLiveTriage);
        inputEl.addEventListener("change", updateLiveTriage);
        inputEl.addEventListener("keyup", updateLiveTriage);
      }
    });

    // LocalStorage Helpers for Standalone / GitHub Pages Mode
    function getLocalPatients() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          return [];
        }
        return JSON.parse(raw) || [];
      } catch (e) {
        return [];
      }
    }

    function saveLocalPatients(patients) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }
    }

    // Update Statistics UI
    function renderStats(stats) {
      if (statsTotal) statsTotal.textContent = stats.total || 0;
      if (statsNormal) statsNormal.textContent = stats.normal || 0;
      if (statsPemantauan) statsPemantauan.textContent = stats.pemantauan || 0;
      if (statsPemeriksaan) statsPemeriksaan.textContent = stats.pemeriksaan || 0;
    }

    async function loadStats() {
      if (isOfflineMode) {
        const patients = getLocalPatients();
        renderStats(computeLocalStats(patients));
        return;
      }

      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Stats endpoint unavailable");
        const stats = await res.json();
        renderStats(stats);
      } catch (err) {
        isOfflineMode = true;
        const patients = getLocalPatients();
        renderStats(computeLocalStats(patients));
      }
    }

    // Render Table
    function renderTable(patients) {
      if (!tableBody) return;
      tableBody.innerHTML = "";

      if (!patients || patients.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (emptyState) emptyState.style.display = "none";

      patients.forEach((p, idx) => {
        const tr = document.createElement("tr");

        let badgeCls = "status-normal";
        if (p.hasil === "Perlu pemantauan lebih lanjut") {
          badgeCls = "status-warning";
        } else if (p.hasil === "Disarankan pemeriksaan oleh tenaga kesehatan") {
          badgeCls = "status-danger";
        }

        const genderShort = p.jenis_kelamin && p.jenis_kelamin.includes("P") ? "P" : "L";

        tr.innerHTML = `
          <td class="th-num">${idx + 1}</td>
          <td><strong>${escapeHtml(p.nama)}</strong></td>
          <td>${p.umur} th</td>
          <td>${genderShort}</td>
          <td>${p.suhu} &deg;C</td>
          <td>${p.nadi} bpm</td>
          <td>${p.napas} /m</td>
          <td>
            <span class="status-pill ${badgeCls}">
              ${escapeHtml(p.hasil)}
            </span>
          </td>
          <td class="th-action">
            <div class="action-btns">
              <button class="btn-table-icon btn-detail" data-id="${p.id}" title="Lihat Lembar Skrining">Detail</button>
              <button class="btn-table-icon btn-table-danger btn-delete" data-id="${p.id}" title="Hapus Data">Hapus</button>
            </div>
          </td>
        `;

        tableBody.appendChild(tr);
      });

      // Attach row button events
      tableBody.querySelectorAll(".btn-detail").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.getAttribute("data-id"), 10);
          const patient = allPatients.find((pt) => pt.id === id);
          if (patient) openDetailModal(patient);
        });
      });

      tableBody.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.getAttribute("data-id"), 10);
          deletePatient(id);
        });
      });
    }

    // Filter patients locally by search and status dropdown
    function applyFilters() {
      const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
      const filter = (filterStatus ? filterStatus.value : "").trim();

      let filtered = allPatients;

      if (query) {
        filtered = filtered.filter((p) => p.nama && p.nama.toLowerCase().includes(query));
      }

      if (filter) {
        filtered = filtered.filter((p) => p.hasil === filter);
      }

      renderTable(filtered);
    }

    // Load Patients
    async function loadPatients() {
      if (isOfflineMode) {
        allPatients = getLocalPatients();
        applyFilters();
        return;
      }

      try {
        const res = await fetch("/api/patients");
        if (!res.ok) throw new Error("Patients endpoint unavailable");
        const result = await res.json();
        allPatients = result.data || [];
        applyFilters();
      } catch (err) {
        isOfflineMode = true;
        allPatients = getLocalPatients();
        applyFilters();
      }
    }

    // Form Submit Handler
    if (patientForm) {
      patientForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nama = inputNama ? inputNama.value.trim() : "";
        const umur = inputUmur ? parseInt(inputUmur.value, 10) : 0;
        const jenis_kelamin = inputGender ? inputGender.value : "L";
        const suhu = inputSuhu ? parseFloat(inputSuhu.value) : 36.5;
        const nadi = inputNadi ? parseInt(inputNadi.value, 10) : 75;
        const napas = inputNapas ? parseInt(inputNapas.value, 10) : 16;

        if (!nama) {
          showToast("Nama pasien tidak boleh kosong");
          if (inputNama) inputNama.focus();
          return;
        }

        if (isNaN(umur) || umur < 1 || umur > 120) {
          showToast("Umur harus di antara 1 sampai 120 tahun");
          if (inputUmur) inputUmur.focus();
          return;
        }

        if (isNaN(suhu) || isNaN(nadi) || isNaN(napas)) {
          showToast("Mohon lengkapi seluruh tanda vital dengan benar.");
          return;
        }

        const payload = { nama, umur, jenis_kelamin, suhu, nadi, napas };

        if (isOfflineMode) {
          // LocalStorage mode
          const localPatients = getLocalPatients();
          const nextId = localPatients.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
          const resSuhu = cekSuhu(suhu);
          const resNadi = cekNadi(nadi);
          const resNapas = cekPernapasan(napas);
          const resSummary = hasilSkrining(suhu, nadi, napas);

          const genderLabel = jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)";
          const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

          const newPatient = {
            id: nextId,
            nama,
            umur,
            jenis_kelamin: genderLabel,
            suhu: Math.round(suhu * 10) / 10,
            status_suhu: resSuhu.label,
            nadi,
            status_nadi: resNadi.label,
            napas,
            status_napas: resNapas.label,
            hasil: resSummary.label,
            created_at: nowStr
          };

          localPatients.unshift(newPatient);
          saveLocalPatients(localPatients);
          allPatients = localPatients;
          showToast("Data pasien berhasil disimpan (Penyimpanan Lokal)");
          resetForm();
          applyFilters();
          renderStats(computeLocalStats(allPatients));
          return;
        }

        // Server API mode
        try {
          const res = await fetch("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const err = await res.json();
            showToast(err.error || "Gagal menyimpan data");
            return;
          }

          showToast("Data pasien berhasil disimpan");
          resetForm();
          await loadPatients();
          await loadStats();
        } catch (err) {
          // Connection failure: switch to local persistence transparently
          isOfflineMode = true;
          const localPatients = getLocalPatients();
          const nextId = localPatients.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
          const resSuhu = cekSuhu(suhu);
          const resNadi = cekNadi(nadi);
          const resNapas = cekPernapasan(napas);
          const resSummary = hasilSkrining(suhu, nadi, napas);

          const genderLabel = jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)";
          const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

          const newPatient = {
            id: nextId,
            nama,
            umur,
            jenis_kelamin: genderLabel,
            suhu: Math.round(suhu * 10) / 10,
            status_suhu: resSuhu.label,
            nadi,
            status_nadi: resNadi.label,
            napas,
            status_napas: resNapas.label,
            hasil: resSummary.label,
            created_at: nowStr
          };

          localPatients.unshift(newPatient);
          saveLocalPatients(localPatients);
          allPatients = localPatients;
          showToast("Data pasien berhasil disimpan (Penyimpanan Lokal)");
          resetForm();
          applyFilters();
          renderStats(computeLocalStats(allPatients));
        }
      });
    }

    // Delete Patient
    async function deletePatient(id) {
      if (!confirm(`Konfirmasi: Hapus data pasien #${id}?`)) {
        return;
      }

      if (isOfflineMode) {
        let localPatients = getLocalPatients();
        localPatients = localPatients.filter((p) => p.id !== id);
        saveLocalPatients(localPatients);
        allPatients = localPatients;
        showToast(`Data pasien #${id} berhasil dihapus`);
        applyFilters();
        renderStats(computeLocalStats(allPatients));
        return;
      }

      try {
        const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast(`Data pasien #${id} berhasil dihapus`);
          await loadPatients();
          await loadStats();
        } else {
          showToast("Gagal menghapus data dari server");
        }
      } catch (err) {
        showToast("Gagal berkomunikasi dengan server");
      }
    }

    // Reset Form
    function resetForm() {
      if (inputNama) inputNama.value = "";
      if (inputUmur) inputUmur.value = "";
      if (inputGender) inputGender.value = "L";
      if (inputSuhu) inputSuhu.value = "36.5";
      if (inputNadi) inputNadi.value = "75";
      if (inputNapas) inputNapas.value = "16";
      updateLiveTriage();
    }

    if (btnReset) {
      btnReset.addEventListener("click", resetForm);
    }

    // Search Input with Debounce
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          applyFilters();
        }, 250);
      });
    }

    // Filter Dropdown
    if (filterStatus) {
      filterStatus.addEventListener("change", () => {
        applyFilters();
      });
    }

    // Detail Modal
    function openDetailModal(p) {
      if (!modalContent) return;
      modalContent.innerHTML = `
        <div class="slip-detail-grid">
          <div class="slip-label">Nama Pasien:</div>
          <div class="slip-value"><strong>${escapeHtml(p.nama)}</strong></div>

          <div class="slip-label">Umur:</div>
          <div class="slip-value">${p.umur} tahun</div>

          <div class="slip-label">Jenis Kelamin:</div>
          <div class="slip-value">${escapeHtml(p.jenis_kelamin)}</div>

          <div class="slip-label">Suhu Tubuh:</div>
          <div class="slip-value">${p.suhu} &deg;C (${escapeHtml(p.status_suhu)})</div>

          <div class="slip-label">Denyut Nadi:</div>
          <div class="slip-value">${p.nadi} kali/menit (${escapeHtml(p.status_nadi)})</div>

          <div class="slip-label">Pernapasan:</div>
          <div class="slip-value">${p.napas} kali/menit (${escapeHtml(p.status_napas)})</div>

          <div class="slip-label">Hasil Skrining:</div>
          <div class="slip-value"><strong>${escapeHtml(p.hasil)}</strong></div>

          <div class="slip-label">Waktu Skrining:</div>
          <div class="slip-value">${p.created_at || "Baru saja"}</div>
        </div>
      `;
      if (detailModal) detailModal.style.display = "flex";
    }

    function closeModal() {
      if (detailModal) detailModal.style.display = "none";
    }

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (btnDismissModal) btnDismissModal.addEventListener("click", closeModal);
    if (detailModal) {
      detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) closeModal();
      });
    }

    if (btnPrintModal) {
      btnPrintModal.addEventListener("click", () => {
        window.print();
      });
    }

    // Export CSV
    if (btnExportCsv) {
      btnExportCsv.addEventListener("click", () => {
        const dataToExport = allPatients;
        if (!dataToExport || dataToExport.length === 0) {
          showToast("Tidak ada data untuk diekspor");
          return;
        }

        const headers = [
          "ID",
          "Nama",
          "Umur",
          "Jenis Kelamin",
          "Suhu (C)",
          "Status Suhu",
          "Nadi (bpm)",
          "Status Nadi",
          "Napas (/m)",
          "Status Napas",
          "Hasil Skrining",
          "Waktu"
        ];

        const rows = dataToExport.map((p) => [
          p.id,
          `"${(p.nama || "").replace(/"/g, '""')}"`,
          p.umur,
          `"${p.jenis_kelamin || ""}"`,
          p.suhu,
          `"${p.status_suhu || ""}"`,
          p.nadi,
          `"${p.status_nadi || ""}"`,
          p.napas,
          `"${p.status_napas || ""}"`,
          `"${(p.hasil || "").replace(/"/g, '""')}"`,
          `"${p.created_at || ""}"`
        ]);

        const csvContent =
          "data:text/csv;charset=utf-8," +
          [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `data_skrining_pasien_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    // Scroll to Form
    if (btnScrollForm) {
      btnScrollForm.addEventListener("click", () => {
        const formEl = document.getElementById("form-container");
        if (formEl) {
          formEl.scrollIntoView({ behavior: "smooth" });
          if (inputNama) inputNama.focus();
        }
      });
    }

    // Toast Notification
    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.style.display = "block";
      setTimeout(() => {
        toast.style.display = "none";
      }, 3200);
    }

    // Initial Boot Sequence
    updateLiveTriage();
    loadStats();
    loadPatients();
  });
}
