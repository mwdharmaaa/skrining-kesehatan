/**
 * Patient Health Screening Application (Frontend)
 * Implements real-time vital sign triage, patient registration,
 * searchable datagrid, and live statistics.
 */

document.addEventListener("DOMContentLoaded", () => {
  // State
  let allPatients = [];
  let debounceTimer = null;

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

  // Clinical Triage Rules (Mirroring Python screening.py)
  function cekSuhu(suhu) {
    if (suhu >= 38.0) return { label: "Demam", cls: "status-danger" };
    if (suhu >= 37.5) return { label: "Perlu Pemantauan", cls: "status-warning" };
    return { label: "Normal", cls: "status-normal" };
    
;
    if (suhu >= 37.5) return { label: "Perlu Pemantauan", cls: "status-warning" };
    return { label: "Normal", cls: "status-normal" };
  }

  function cekNadi(nadi) {
    if (nadi < 60) return { label: "Nadi Rendah", cls: "status-warning" };
    if (nadi <= 100) return { label: "Nadi Normal", cls: "status-normal" };
    return { label: "Nadi Tinggi", cls: "status-danger" };
  }

  function cekPernapasan(napas) {
    if (napas < 12) return { label: "Pernapasan Lambat", cls: "status-warning" };
    if (napas <= 20) return { label: "Pernapasan Normal", cls: "status-normal" };
    return { label: "Pernapasan Cepat", cls: "status-danger" };
  }

  function hasilSkrining(suhu, nadi, napas) {
    let warning = 0;
    if (suhu >= 38.0) warning++;
    if (nadi < 60 || nadi > 100) warning++;
    if (napas < 12 || napas > 20) warning++;

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

  // Live Triage Input Update
  function updateLiveTriage() {
    const suhu = parseFloat(inputSuhu.value) || 36.5;
    const nadi = parseInt(inputNadi.value, 10) || 75;
    const napas = parseInt(inputNapas.value, 10) || 16;

    const resSuhu = cekSuhu(suhu);
    const resNadi = cekNadi(nadi);
    const resNapas = cekPernapasan(napas);
    const resSummary = hasilSkrining(suhu, nadi, napas);

    badgeSuhu.textContent = resSuhu.label;
    badgeSuhu.className = `status-pill ${resSuhu.cls}`;

    badgeNadi.textContent = resNadi.label;
    badgeNadi.className = `status-pill ${resNadi.cls}`;

    badgeNapas.textContent = resNapas.label;
    badgeNapas.className = `status-pill ${resNapas.cls}`;

    badgeSummary.textContent = resSummary.label;
    badgeSummary.className = `triage-preview-value ${resSummary.cls}`;
  }

  [inputSuhu, inputNadi, inputNapas].forEach((el) => {
    el.addEventListener("input", updateLiveTriage);
  });

  // Toast Notification
  function showToast(message) {
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 3200);
  }

  // Load Statistics
  async function loadStats() {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) return;
      const stats = await res.json();
      statsTotal.textContent = stats.total;
      statsNormal.textContent = stats.normal;
      statsPemantauan.textContent = stats.pemantauan;
      statsPemeriksaan.textContent = stats.pemeriksaan;
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  // Render Table
  function renderTable(patients) {
    tableBody.innerHTML = "";
    if (!patients || patients.length === 0) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    patients.forEach((p, idx) => {
      const tr = document.createElement("tr");

      let pillCls = "status-normal";
      if (p.hasil.includes("Perlu pemantauan")) pillCls = "status-warning";
      if (p.hasil.includes("Disarankan pemeriksaan")) pillCls = "status-danger";

      tr.innerHTML = `
        <td class="th-num">${idx + 1}</td>
        <td><strong>${escapeHtml(p.nama)}</strong></td>
        <td>${p.umur} th</td>
        <td>${escapeHtml(p.jenis_kelamin)}</td>
        <td>${p.suhu}&deg;C <span class="field-hint">${escapeHtml(p.status_suhu)}</span></td>
        <td>${p.nadi} <span class="field-hint">${escapeHtml(p.status_nadi)}</span></td>
        <td>${p.napas} <span class="field-hint">${escapeHtml(p.status_napas)}</span></td>
        <td><span class="status-pill ${pillCls}">${escapeHtml(p.hasil)}</span></td>
        <td class="th-action">
          <div class="action-btns">
            <button class="btn-table-icon btn-view" data-id="${p.id}">Lihat</button>
            <button class="btn-table-icon btn-table-danger btn-delete" data-id="${p.id}">Hapus</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach actions
    document.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = allPatients.find((x) => x.id === id);
        if (item) openDetailModal(item);
      });
    });

    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        if (confirm(`Hapus data pasien #${id}?`)) {
          await deletePatient(id);
        }
      });
    });
  }

  // Load Patients
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients");
      if (!res.ok) return;
      const json = await res.json();
      allPatients = json.data || [];
      applyFilter();
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  }

  // Filter and Search Handler
  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    const statusVal = filterStatus.value;

    let filtered = allPatients.filter((p) => {
      const matchesSearch = !q || p.nama.toLowerCase().includes(q);
      const matchesStatus = !statusVal || p.hasil === statusVal;
      return matchesSearch && matchesStatus;
    });

    renderTable(filtered);
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilter, 180);
  });

  filterStatus.addEventListener("change", applyFilter);

  // Form Submit
  patientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama = inputNama.value.trim();
    const umur = parseInt(inputUmur.value, 10);
    const jenis_kelamin = inputGender.value;
    const suhu = parseFloat(inputSuhu.value);
    const nadi = parseInt(inputNadi.value, 10);
    const napas = parseInt(inputNapas.value, 10);

    if (!nama || isNaN(umur) || isNaN(suhu) || isNaN(nadi) || isNaN(napas)) {
      showToast("Mohon lengkapi semua data tanda vital dengan benar.");
      return;
    }

    const payload = { nama, umur, jenis_kelamin, suhu, nadi, napas };

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
      showToast("Terjadi kendala koneksi ke server");
      console.error(err);
    }
  });

  function resetForm() {
    inputNama.value = "";
    inputUmur.value = "";
    inputGender.value = "L";
    inputSuhu.value = "36.5";
    inputNadi.value = "75";
    inputNapas.value = "16";
    updateLiveTriage();
  }

  btnReset.addEventListener("click", resetForm);

  // Delete Patient
  async function deletePatient(id) {
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Data pasien #${id} berhasil dihapus`);
        await loadPatients();
        await loadStats();
      }
    } catch (err) {
      showToast("Gagal menghapus data");
    }
  }

  // Detail Modal
  function openDetailModal(p) {
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
    detailModal.style.display = "flex";
  }

  function closeModal() {
    detailModal.style.display = "none";
  }

  btnCloseModal.addEventListener("click", closeModal);
  btnDismissModal.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  btnPrintModal.addEventListener("click", () => {
    window.print();
  });

  // Export CSV
  btnExportCsv.addEventListener("click", () => {
    if (!allPatients || allPatients.length === 0) {
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

    const rows = allPatients.map((p) => [
      p.id,
      `"${p.nama.replace(/"/g, '""')}"`,
      p.umur,
      `"${p.jenis_kelamin}"`,
      p.suhu,
      `"${p.status_suhu}"`,
      p.nadi,
      `"${p.status_nadi}"`,
      p.napas,
      `"${p.status_napas}"`,
      `"${p.hasil}"`,
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

  // Scroll to form button
  if (btnScrollForm) {
    btnScrollForm.addEventListener("click", () => {
      document.getElementById("form-container").scrollIntoView({ behavior: "smooth" });
      inputNama.focus();
    });
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

  // Initial Boot
  updateLiveTriage();
  loadStats();
  loadPatients();
});
