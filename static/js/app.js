/**
 * Patient Blood Pressure Screening Application (Frontend)
 * Implements real-time blood pressure triage, patient registration,
 * searchable datagrid, live statistics, and dual-mode persistence (API + LocalStorage).
 */

// ==============================================================================
// CLINICAL TRIAGE RULES ENGINE (Exact parity with Python screening.py)
// ==============================================================================

function cekSistolik(sistolik) {
  const val = parseInt(sistolik, 10);
  if (isNaN(val)) return { label: "Sistolik Normal", cls: "status-normal" };
  if (val >= 180) return { label: "Sistolik Krisis (Sangat Tinggi)", cls: "status-critical" };
  if (val >= 140) return { label: "Sistolik Tinggi (Hipertensi Derajat 2)", cls: "status-severe" };
  if (val >= 130) return { label: "Sistolik Tinggi (Hipertensi Derajat 1)", cls: "status-alert" };
  if (val >= 120) return { label: "Sistolik Meningkat (Prahipertensi)", cls: "status-caution" };
  if (val >= 90) return { label: "Sistolik Normal", cls: "status-normal" };
  return { label: "Sistolik Rendah (Hipotensi)", cls: "status-info" };
}

function cekDiastolik(diastolik) {
  const val = parseInt(diastolik, 10);
  if (isNaN(val)) return { label: "Diastolik Normal", cls: "status-normal" };
  if (val >= 120) return { label: "Diastolik Krisis (Sangat Tinggi)", cls: "status-critical" };
  if (val >= 90) return { label: "Diastolik Tinggi (Hipertensi Derajat 2)", cls: "status-severe" };
  if (val >= 80) return { label: "Diastolik Tinggi (Hipertensi Derajat 1)", cls: "status-alert" };
  if (val >= 60) return { label: "Diastolik Normal", cls: "status-normal" };
  return { label: "Diastolik Rendah (Hipotensi)", cls: "status-info" };
}

function cekNadi(nadi) {
  const val = parseInt(nadi, 10);
  if (isNaN(val)) return { label: "Nadi Normal", cls: "status-normal" };
  if (val < 60) return { label: "Nadi Rendah", cls: "status-warning" };
  if (val <= 100) return { label: "Nadi Normal", cls: "status-normal" };
  return { label: "Nadi Tinggi", cls: "status-danger" };
}

function hasilSkrining(sistolik, diastolik) {
  const s = parseInt(sistolik, 10);
  const d = parseInt(diastolik, 10);

  if (!isNaN(s) && !isNaN(d)) {
    if (s >= 180 || d >= 120) {
      return {
        label: "Krisis Hipertensi (Bahaya - Perlu Tindakan Darurat)",
        cls: "status-critical"
      };
    }
    if (s >= 140 || d >= 90) {
      return {
        label: "Hipertensi Derajat 2",
        cls: "status-severe"
      };
    }
    if (s >= 130 || d >= 80) {
      return {
        label: "Hipertensi Derajat 1",
        cls: "status-alert"
      };
    }
    if (s >= 120 && d < 80) {
      return {
        label: "Prahipertensi (Meningkat)",
        cls: "status-caution"
      };
    }
    if (s < 90 || d < 60) {
      return {
        label: "Hipotensi (Tekanan Darah Rendah)",
        cls: "status-info"
      };
    }
  }

  return {
    label: "Tekanan Darah Normal",
    cls: "status-normal"
  };
}

function computeLocalStats(patients) {
  const list = patients || [];
  let total = list.length;
  let normal = 0;
  let hipotensi = 0;
  let prahipertensi = 0;
  let hipertensi_1 = 0;
  let hipertensi_2 = 0;
  let krisis = 0;

  list.forEach((p) => {
    const h = p.hasil || "";
    if (h === "Tekanan Darah Normal") normal++;
    else if (h === "Hipotensi (Tekanan Darah Rendah)") hipotensi++;
    else if (h === "Prahipertensi (Meningkat)") prahipertensi++;
    else if (h === "Hipertensi Derajat 1") hipertensi_1++;
    else if (h === "Hipertensi Derajat 2") hipertensi_2++;
    else if (h.includes("Krisis")) krisis++;
  });

  return {
    total,
    normal,
    hipotensi,
    prahipertensi,
    hipertensi_1,
    hipertensi_2,
    krisis
  };
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cekSistolik,
    cekDiastolik,
    cekNadi,
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
    let allPatients = [];
    let isOfflineMode = false;
    let debounceTimer = null;

    const STORAGE_KEY = "skrining_tekanan_darah_v1";

    // DOM Elements - Stats
    const statsTotal = document.getElementById("stats-total");
    const statsNormal = document.getElementById("stats-normal");
    const statsHipotensi = document.getElementById("stats-hipotensi");
    const statsPrahipertensi = document.getElementById("stats-prahipertensi");
    const statsHipertensi1 = document.getElementById("stats-hipertensi-1");
    const statsHipertensi2 = document.getElementById("stats-hipertensi-2");
    const statsKrisis = document.getElementById("stats-krisis");

    // DOM Elements - Form
    const patientForm = document.getElementById("patient-form");
    const inputNama = document.getElementById("input-nama");
    const inputUmur = document.getElementById("input-umur");
    const inputGender = document.getElementById("input-gender");
    const inputSistolik = document.getElementById("input-sistolik");
    const inputDiastolik = document.getElementById("input-diastolik");
    const inputNadi = document.getElementById("input-nadi");

    // DOM Elements - Badges
    const badgeSistolik = document.getElementById("badge-sistolik");
    const badgeDiastolik = document.getElementById("badge-diastolik");
    const badgeNadi = document.getElementById("badge-nadi");
    const badgeSummary = document.getElementById("badge-skrining-summary");

    // DOM Elements - Controls & Table
    const searchInput = document.getElementById("search-input");
    const filterStatus = document.getElementById("filter-status");
    const tableBody = document.getElementById("table-body");
    const emptyState = document.getElementById("empty-state");

    const btnReset = document.getElementById("btn-reset");
    const btnExportCsv = document.getElementById("btn-export-csv");
    const btnScrollForm = document.getElementById("btn-scroll-form");

    // DOM Elements - Modals
    const detailModal = document.getElementById("detail-modal");
    const modalContent = document.getElementById("modal-content");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnDismissModal = document.getElementById("btn-dismiss-modal");
    const btnPrintModal = document.getElementById("btn-print-modal");

    const confirmModal = document.getElementById("confirm-modal");
    const confirmModalText = document.getElementById("confirm-modal-text");
    const btnCloseConfirm = document.getElementById("btn-close-confirm");
    const btnCancelDelete = document.getElementById("btn-cancel-delete");
    const btnConfirmDelete = document.getElementById("btn-confirm-delete");
    const toast = document.getElementById("toast");

    let pendingDeleteId = null;

    // Reactive Live Triage Calculation
    function updateLiveTriage() {
      const sisRaw = inputSistolik ? inputSistolik.value : "120";
      const diaRaw = inputDiastolik ? inputDiastolik.value : "80";
      const nadiRaw = inputNadi ? inputNadi.value : "75";

      const resSis = cekSistolik(sisRaw);
      const resDia = cekDiastolik(diaRaw);
      const resNadi = cekNadi(nadiRaw);
      const resSummary = hasilSkrining(sisRaw, diaRaw);

      if (badgeSistolik) {
        badgeSistolik.textContent = resSis.label;
        badgeSistolik.className = `status-pill ${resSis.cls}`;
      }
      if (badgeDiastolik) {
        badgeDiastolik.textContent = resDia.label;
        badgeDiastolik.className = `status-pill ${resDia.cls}`;
      }
      if (badgeNadi) {
        badgeNadi.textContent = resNadi.label;
        badgeNadi.className = `status-pill ${resNadi.cls}`;
      }
      if (badgeSummary) {
        badgeSummary.textContent = resSummary.label;
        badgeSummary.className = `triage-preview-value ${resSummary.cls}`;
      }
    }

    [inputSistolik, inputDiastolik, inputNadi].forEach((el) => {
      if (el) {
        el.addEventListener("input", updateLiveTriage);
        el.addEventListener("change", updateLiveTriage);
        el.addEventListener("keyup", updateLiveTriage);
      }
    });

    // LocalStorage Helpers
    function getLocalPatients() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
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

    // Render Statistics UI
    function renderStats(stats) {
      if (statsTotal) statsTotal.textContent = stats.total || 0;
      if (statsNormal) statsNormal.textContent = stats.normal || 0;
      if (statsHipotensi) statsHipotensi.textContent = stats.hipotensi || 0;
      if (statsPrahipertensi) statsPrahipertensi.textContent = stats.prahipertensi || 0;
      if (statsHipertensi1) statsHipertensi1.textContent = stats.hipertensi_1 || 0;
      if (statsHipertensi2) statsHipertensi2.textContent = stats.hipertensi_2 || 0;
      if (statsKrisis) statsKrisis.textContent = stats.krisis || 0;
    }

    async function loadStats() {
      if (isOfflineMode) {
        renderStats(computeLocalStats(getLocalPatients()));
        return;
      }

      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Stats endpoint unavailable");
        const stats = await res.json();
        renderStats(stats);
      } catch (err) {
        isOfflineMode = true;
        renderStats(computeLocalStats(getLocalPatients()));
      }
    }

    // Render Datatable
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
        const h = p.hasil || "";
        if (h.includes("Krisis")) badgeCls = "status-critical";
        else if (h.includes("Derajat 2")) badgeCls = "status-severe";
        else if (h.includes("Derajat 1")) badgeCls = "status-alert";
        else if (h.includes("Prahipertensi")) badgeCls = "status-caution";
        else if (h.includes("Hipotensi")) badgeCls = "status-info";

        const genderShort = (p.jenis_kelamin || "").includes("L") ? "L" : "P";

        tr.innerHTML = `
          <td class="td-num">${idx + 1}</td>
          <td><strong>${escapeHtml(p.nama)}</strong></td>
          <td>${p.umur} th</td>
          <td>${genderShort}</td>
          <td>${p.sistolik} mmHg</td>
          <td>${p.diastolik} mmHg</td>
          <td>${p.nadi} bpm</td>
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
          const patient = allPatients.find((pt) => pt.id === id);
          openConfirmModal(id, patient ? patient.nama : "");
        });
      });
    }

    // Filter Logic
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

    // Form Submit
    if (patientForm) {
      patientForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nama = (inputNama ? inputNama.value : "").trim();
        const umur = parseInt(inputUmur ? inputUmur.value : "", 10);
        const jenis_kelamin = inputGender ? inputGender.value : "L";
        const sistolik = parseInt(inputSistolik ? inputSistolik.value : "", 10);
        const diastolik = parseInt(inputDiastolik ? inputDiastolik.value : "", 10);
        const nadi = parseInt(inputNadi ? inputNadi.value : "", 10);

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

        if (isNaN(sistolik) || isNaN(diastolik) || isNaN(nadi)) {
          showToast("Mohon lengkapi tekanan darah dan denyut nadi dengan benar.");
          return;
        }

        const patientPayload = {
          nama,
          umur,
          jenis_kelamin,
          sistolik,
          diastolik,
          nadi
        };

        if (isOfflineMode) {
          const resSis = cekSistolik(sistolik);
          const resDia = cekDiastolik(diastolik);
          const resNadi = cekNadi(nadi);
          const resSummary = hasilSkrining(sistolik, diastolik);

          let localPatients = getLocalPatients();
          const newId = localPatients.length > 0 ? Math.max(...localPatients.map((p) => p.id || 0)) + 1 : 1;

          const newPatient = {
            id: newId,
            nama,
            umur,
            jenis_kelamin: jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)",
            sistolik,
            status_sistolik: resSis.label,
            diastolik,
            status_diastolik: resDia.label,
            nadi,
            status_nadi: resNadi.label,
            hasil: resSummary.label,
            created_at: new Date().toISOString().replace("T", " ").slice(0, 19)
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

        try {
          const res = await fetch("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patientPayload)
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
          isOfflineMode = true;
          const resSis = cekSistolik(sistolik);
          const resDia = cekDiastolik(diastolik);
          const resNadi = cekNadi(nadi);
          const resSummary = hasilSkrining(sistolik, diastolik);

          let localPatients = getLocalPatients();
          const newId = localPatients.length > 0 ? Math.max(...localPatients.map((p) => p.id || 0)) + 1 : 1;

          const newPatient = {
            id: newId,
            nama,
            umur,
            jenis_kelamin: jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)",
            sistolik,
            status_sistolik: resSis.label,
            diastolik,
            status_diastolik: resDia.label,
            nadi,
            status_nadi: resNadi.label,
            hasil: resSummary.label,
            created_at: new Date().toISOString().replace("T", " ").slice(0, 19)
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

    // In-App Confirm Modal for Deletion
    function openConfirmModal(id, nama) {
      pendingDeleteId = id;
      if (confirmModalText) {
        confirmModalText.innerHTML = `Apakah kamu yakin ingin menghapus data pasien <strong>${escapeHtml(nama || `#${id}`)}</strong>?`;
      }
      if (confirmModal) confirmModal.style.display = "flex";
    }

    function closeConfirmModal() {
      pendingDeleteId = null;
      if (confirmModal) confirmModal.style.display = "none";
    }

    if (btnCloseConfirm) btnCloseConfirm.addEventListener("click", closeConfirmModal);
    if (btnCancelDelete) btnCancelDelete.addEventListener("click", closeConfirmModal);

    if (confirmModal) {
      confirmModal.addEventListener("click", (e) => {
        if (e.target === confirmModal) closeConfirmModal();
      });
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener("click", async () => {
        if (pendingDeleteId !== null) {
          const idToDelete = pendingDeleteId;
          closeConfirmModal();
          await executeDeletePatient(idToDelete);
        }
      });
    }

    async function executeDeletePatient(id) {
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
      if (inputSistolik) inputSistolik.value = "120";
      if (inputDiastolik) inputDiastolik.value = "80";
      if (inputNadi) inputNadi.value = "75";
      updateLiveTriage();
    }

    if (btnReset) {
      btnReset.addEventListener("click", resetForm);
    }

    // Search and Filter Listeners
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          applyFilters();
        }, 180);
      });
    }

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

          <div class="slip-label">Tekanan Darah:</div>
          <div class="slip-value"><strong>${p.sistolik}/${p.diastolik} mmHg</strong></div>

          <div class="slip-label">Status Sistolik:</div>
          <div class="slip-value">${escapeHtml(p.status_sistolik || "-")}</div>

          <div class="slip-label">Status Diastolik:</div>
          <div class="slip-value">${escapeHtml(p.status_diastolik || "-")}</div>

          <div class="slip-label">Denyut Nadi:</div>
          <div class="slip-value">${p.nadi} kali/menit (${escapeHtml(p.status_nadi || "-")})</div>

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

    // CSV Exporter
    if (btnExportCsv) {
      btnExportCsv.addEventListener("click", () => {
        const dataToExport = allPatients;
        if (!dataToExport || dataToExport.length === 0) {
          showToast("Tidak ada data untuk diekspor");
          return;
        }

        const headers = [
          "ID",
          "Nama Pasien",
          "Umur",
          "Jenis Kelamin",
          "Sistolik (mmHg)",
          "Status Sistolik",
          "Diastolik (mmHg)",
          "Status Diastolik",
          "Nadi (bpm)",
          "Status Nadi",
          "Hasil Skrining",
          "Waktu"
        ];

        const rows = dataToExport.map((p) => [
          p.id,
          `"${(p.nama || "").replace(/"/g, '""')}"`,
          p.umur,
          `"${p.jenis_kelamin || ""}"`,
          p.sistolik,
          `"${p.status_sistolik || ""}"`,
          p.diastolik,
          `"${p.status_diastolik || ""}"`,
          p.nadi,
          `"${p.status_nadi || ""}"`,
          `"${(p.hasil || "").replace(/"/g, '""')}"`,
          `"${p.created_at || ""}"`
        ]);

        const csvContent =
          "data:text/csv;charset=utf-8," +
          [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `data_tekanan_darah_${new Date().toISOString().slice(0, 10)}.csv`);
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
    let toastTimeout = null;
    function showToast(message) {
      if (!toast) return;
      if (toastTimeout) clearTimeout(toastTimeout);
      toast.textContent = message;
      toast.style.display = "block";
      toastTimeout = setTimeout(() => {
        toast.style.display = "none";
      }, 3000);
    }

    // Global Key Listener for Modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (confirmModal && confirmModal.style.display === "flex") {
          closeConfirmModal();
        } else if (detailModal && detailModal.style.display === "flex") {
          closeModal();
        }
      }
    });

    // Initial Boot Sequence
    updateLiveTriage();
    loadStats();
    loadPatients();
  });
}
