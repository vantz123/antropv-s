// ============================================================================
// DATABASE & GIZI MODULE — simplified HA-based RDA build
// ============================================================================
(function () {
    const HA_FACTORS = [
        { label: '0-6 mo', min: 0, max: 6, energy: 110, protein: 1.5, fluidMin: 150, fluidMax: 180 },
        { label: '7-12 mo', min: 6.0001, max: 12, energy: 100, protein: 1.5, fluidMin: 120, fluidMax: 150 },
        { label: '1-3 yr', min: 12.0001, max: 36, energy: 100, protein: 1.2, fluidMin: 100, fluidMax: 120 },
        { label: '4-6 yr', min: 36.0001, max: 72, energy: 90, protein: 1.0, fluidMin: 90, fluidMax: 110 },
        { label: '7-9 yr', min: 72.0001, max: 108, energy: 80, protein: 1.0, fluidMin: 70, fluidMax: 90 },
        { label: '10-12 yr', min: 108.0001, max: 144, energy: 70, protein: 1.0, fluidMin: 50, fluidMax: 70 },
        { label: '12-18 yr', min: 144.0001, max: 216, energy: 45, protein: 0.9, fluidMin: 40, fluidMax: 60 }
    ];

    function byId(id) { return document.getElementById(id); }
    function setHtml(id, html) { const el = byId(id); if (el) { el.innerHTML = html; el.style.display = 'block'; } }
    function setValue(id, value) { const el = byId(id); if (el) el.value = value; }
    function formatModeLabel(mode) {
        if (window.getCalculationModeLabel) return window.getCalculationModeLabel(mode);
        return mode || '-';
    }

    function getStatusRingkas(r) {
        if (r && r.status_utama_text) return r.status_utama_text;
        if (r && r.bbtb !== undefined && r.bbtb !== null) {
            if (r.bbtb < -3) return 'Gizi Buruk';
            if (r.bbtb < -2) return 'Gizi Kurang';
            if (r.bbtb <= 2) return 'Gizi Baik';
            if (r.bbtb <= 3) return 'Gizi Lebih';
            return 'Obesitas';
        }
        if (r && r.imtu_ref === 'CDC' && r.imtu_pct !== undefined && r.imtu_pct !== null) {
            if (r.imtu_pct < 5) return 'Underweight';
            if (r.imtu_pct < 85) return 'Healthy Weight';
            if (r.imtu_pct < 95) return 'Overweight';
            return 'Obesity';
        }
        return '-';
    }

    function getHAFactorRow(months) {
        const m = Number(months);
        if (!Number.isFinite(m) || m < 0) return HA_FACTORS[0];
        return HA_FACTORS.find(row => m >= row.min && m <= row.max) || HA_FACTORS[HA_FACTORS.length - 1];
    }

    function formatBBTBMetric(r) {
        if (!r) return '-';
        if (r.bbtb_metric_mode === 'cdc_pct_bbi' || (r.calculation_mode === 'cdc_only' && Number.isFinite(r.pBBI))) {
            return `${Number(r.pBBI).toFixed(1)}%`;
        }
        if (Number.isFinite(r.bbtb)) return `${Number(r.bbtb).toFixed(2)}`;
        return '-';
    }

    function badgeForStatus(status) {
        return /Buruk|Underweight|Short/i.test(status) ? 'status-severe' :
               /Kurang|Low/i.test(status) ? 'status-moderate' :
               /Baik|Healthy|Normal/i.test(status) ? 'status-normal' :
               /Lebih|Overweight|High/i.test(status) ? 'status-risk' :
               /Obes|Tall|Very High/i.test(status) ? 'status-obese' : 'status-info';
    }

    function renderRDAAdjustmentTable(data) {
        const host = byId('rda-adjustment-table');
        if (!host) return;
        if (!data) {
            host.innerHTML = '<h3>📋 Tabel penyesuaian RDA</h3><p class="mini-note">Hitung antropometri dulu untuk mengisi BBI, WA, dan HA.</p>';
            return;
        }
        const haMonths = Number.isFinite(data.haMonth) ? Number(data.haMonth) : (Number.isFinite(data.umur_dipakai) ? Number(data.umur_dipakai) : 0);
        const row = getHAFactorRow(haMonths);
        const haYears = haMonths / 12;
        const bbi = Number.isFinite(data.bbi) ? Number(data.bbi) : null;
        const bbs = Number.isFinite(data.bbs) ? Number(data.bbs) : null;
        const energy = bbi !== null ? row.energy * bbi : null;
        const protein = bbi !== null ? row.protein * bbi : null;
        const fluidMin = bbs !== null ? row.fluidMin * bbs : null;
        const fluidMax = bbs !== null ? row.fluidMax * bbs : null;
        host.innerHTML = `
            <h3>📋 Tabel penyesuaian RDA</h3>
            <table class="compact-table">
                <thead>
                    <tr><th>BBI</th><th>WA</th><th>HA</th><th>Kelompok HA</th><th>Energi</th><th>Protein</th><th>Cairan</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${bbi !== null ? bbi.toFixed(2) + ' kg' : '-'}</td>
                        <td>${data.wa || '-'}</td>
                        <td>${data.ha || '-'}</td>
                        <td>${row.label}${Number.isFinite(haYears) ? ` (${haYears.toFixed(1)} th)` : ''}</td>
                        <td>${energy !== null ? energy.toFixed(0) + ' kkal' : `${row.energy} × BBI`}</td>
                        <td>${protein !== null ? protein.toFixed(1) + ' g' : `${row.protein} × BBI`}</td>
                        <td>${fluidMin !== null && fluidMax !== null ? `${fluidMin.toFixed(0)}-${fluidMax.toFixed(0)} ml` : `${row.fluidMin}-${row.fluidMax} × BBs`}</td>
                    </tr>
                </tbody>
            </table>
            <p class="mini-note">Energi = faktor × BBI | Protein = faktor × BBI | Cairan = rentang faktor × BB sekarang.</p>
        `;
    }

    function simpanData() {
        if (!window.hasilSementara) {
            alert('Mohon hitung data dulu!');
            return;
        }
        let db = JSON.parse(localStorage.getItem('antropometri_db') || '[]');
        db.push({
            ...window.hasilSementara,
            id: Date.now(),
            tanggal: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem('antropometri_db', JSON.stringify(db));
        alert('✅ Data berhasil disimpan!');
        loadDatabase();
    }

    function loadDatabase() {
        const tbody = byId('tbody_pasien');
        if (!tbody) return;
        const db = JSON.parse(localStorage.getItem('antropometri_db') || '[]');
        if (db.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:20px; color:#888;">Belum ada data tersimpan</td></tr>';
            return;
        }
        tbody.innerHTML = db.map(r => {
            const jk = r.gender === 'male' ? 'L' : (r.gender === 'female' ? 'P' : '-');
            const status = getStatusRingkas(r);
            const badge = badgeForStatus(status);
            return `<tr>
                <td>${r.nama || '-'}${r.calculation_mode ? `<br><small style="color:#666;">${formatModeLabel(r.calculation_mode)}</small>` : ''}</td>
                <td>${jk}</td>
                <td>${(Number(r.umur_bulan || 0) / 12).toFixed(2)}</td>
                <td>${r.bbs != null ? r.bbs : '-'}</td>
                <td>${r.tb != null ? Number(r.tb).toFixed(1) : '-'}</td>
                <td>${r.bbu != null ? Number(r.bbu).toFixed(2) : '-'}</td>
                <td>${r.tbu != null ? Number(r.tbu).toFixed(2) : '-'}</td>
                <td>${formatBBTBMetric(r)}</td>
                <td>${r.wa || '-'}</td>
                <td>${r.ha || '-'}</td>
                <td>${r.bbi != null ? Number(r.bbi).toFixed(2) : '-'}</td>
                <td><span class="status-badge ${badge}" style="font-size:0.75em;">${status}</span></td>
                <td><button class="btn btn-danger" style="padding:5px 12px; font-size:0.85em;" onclick="hapusData(${r.id})">Hapus</button></td>
            </tr>`;
        }).join('');
    }

    function hapusData(id) {
        if (!confirm('Hapus data ini?')) return;
        let db = JSON.parse(localStorage.getItem('antropometri_db') || '[]');
        db = db.filter(r => r.id !== id);
        localStorage.setItem('antropometri_db', JSON.stringify(db));
        loadDatabase();
    }

    function hapusSemuaData() {
        if (confirm('⚠️ Yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan.')) {
            localStorage.removeItem('antropometri_db');
            loadDatabase();
        }
    }

    function exportData() {
        const db = JSON.parse(localStorage.getItem('antropometri_db') || '[]');
        if (!db.length) return alert('Database kosong.');
        const header = 'Nama,Gender,Umur(bln),BB(kg),TB(cm),BB/U,TB/U,BB/TB,WA,HA,BBI,Calculation Mode,Age Basis,BB/U Ref,TB/U Ref,WA Ref,HA Ref,BBI Ref,BBI Source Detail,Status,Tanggal';
        const rows = db.map(r => [
            r.nama || '', r.gender || '', r.umur_bulan || '', r.bbs || '', r.tb || '',
            r.bbu != null ? Number(r.bbu).toFixed(2) : '',
            r.tbu != null ? Number(r.tbu).toFixed(2) : '',
            formatBBTBMetric(r),
            r.wa || '', r.ha || '', r.bbi != null ? Number(r.bbi).toFixed(2) : '',
            formatModeLabel(r.calculation_mode), r.age_basis_label || '',
            r.bbu_ref_detail || r.bbu_ref || '', r.tbu_ref_detail || r.tbu_ref || '',
            r.waSourceDetail || r.waRef || '', r.haSourceDetail || r.haRef || '',
            r.bbi_ref || '', r.bbi_source_detail || '',
            getStatusRingkas(r), r.tanggal || ''
        ].map(v => `"${v}"`).join(','));
        const csv = [header, ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `antropometri_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    function hitungBBIKlinis() {
        const u = parseFloat(byId('bbi_umur').value);
        const tb = parseFloat(byId('bbi_tb').value);
        const g = byId('bbi_gender').value;
        if (isNaN(u) || u < 0) { alert('Isi umur dengan benar.'); return; }
        if (isNaN(tb) || tb <= 0) { alert('Isi TB dengan benar.'); return; }
        const result = hitungBBIKlinis_fn(tb, g, u);
        if (!result) {
            setHtml('hasil-bbi', '❌ Tidak dapat menghitung BBI. Cek data TB dan gender.');
            return;
        }
        const modeText = result.calculation_mode ? `<br><small><strong>Mode:</strong> ${formatModeLabel(result.calculation_mode)}</small>` : '';
        const sourceText = result.sourceDetail ? `<br><small><strong>Sumber:</strong> ${result.sourceDetail}</small>` : '';
        const bbiText = Number.isFinite(result.bbi) ? `${result.bbi.toFixed(2)} kg` : 'tidak tersedia';
        setHtml('hasil-bbi', `
            <strong>BBI Klinis = ${bbiText}</strong><br>
            <strong>HA:</strong> ${formatUmur(result.ha)}<br>
            ${result.note ? `<small style="color:#856404;">⚠️ ${result.note}</small><br>` : ''}
            ${sourceText}
            ${modeText}
        `);
    }

    function hitungTPG() {
        const a = parseFloat(byId('tpg_ayah').value);
        const i = parseFloat(byId('tpg_ibu').value);
        const g = byId('tpg_gender').value;
        if (isNaN(a) || isNaN(i)) { alert('Isi TB Ayah dan Ibu.'); return; }
        const m = g === 'male' ? ((i + 13) + a) / 2 : ((a - 13) + i) / 2;
        setHtml('hasil-tpg', `<strong>TPG = ${m.toFixed(1)} ± 8.5 cm</strong><br>Rentang: ${(m - 8.5).toFixed(1)} - ${(m + 8.5).toFixed(1)} cm`);
    }

    function hitungRDA() {
        const bbi = parseFloat(byId('rda_bbi').value);
        const bbs = parseFloat(byId('rda_bbs').value);
        const fromSummary = window.hasilSementara && Number.isFinite(window.hasilSementara.haMonth) ? Number(window.hasilSementara.haMonth) : null;
        const fallbackMonths = parseFloat(byId('rda_umur').value) * 12;
        const haMonths = Number.isFinite(fromSummary) ? fromSummary : fallbackMonths;
        if (isNaN(bbi) || isNaN(bbs)) { alert('Isi BBI dan BB sekarang.'); return; }
        const row = getHAFactorRow(haMonths);
        const totalEnergi = row.energy * bbi;
        const totalProtein = row.protein * bbi;
        const cairanMin = row.fluidMin * bbs;
        const cairanMax = row.fluidMax * bbs;
        if (window.hasilSementara) {
            window.hasilSementara.rda = {
                ha_group: row.label,
                energy_factor: row.energy,
                protein_factor: row.protein,
                fluid_min_factor: row.fluidMin,
                fluid_max_factor: row.fluidMax,
                energy: totalEnergi,
                protein: totalProtein,
                fluid_min: cairanMin,
                fluid_max: cairanMax
            };
        }
        renderRDAAdjustmentTable(window.hasilSementara || { bbi, bbs, haMonth: haMonths, wa: '-', ha: '-' });
        setHtml('hasil-rda', `
            <strong>Kelompok HA:</strong> ${row.label}<br>
            🔥 <strong>Energi:</strong> ${totalEnergi.toFixed(0)} kkal/hari (${row.energy} × BBI)<br>
            🥩 <strong>Protein:</strong> ${totalProtein.toFixed(1)} g/hari (${row.protein} × BBI)<br>
            💧 <strong>Cairan:</strong> ${cairanMin.toFixed(0)}-${cairanMax.toFixed(0)} ml/hari (${row.fluidMin}-${row.fluidMax} × BB sekarang)
        `);
    }

    function hitungPER() {
        alert('PER disederhanakan dan tidak ditampilkan pada build ini.');
    }

    function hitungPBBI() {
        alert('%BBI detail disederhanakan dan hanya tersimpan pada ringkasan bila diperlukan.');
    }

    window.simpanData = simpanData;
    window.loadDatabase = loadDatabase;
    window.hapusData = hapusData;
    window.hapusSemuaData = hapusSemuaData;
    window.exportData = exportData;
    window.getStatusRingkas = getStatusRingkas;
    window.getHAFactorRow = getHAFactorRow;
    window.renderRDAAdjustmentTable = renderRDAAdjustmentTable;
    window.hitungBBIKlinis = hitungBBIKlinis;
    window.hitungTPG = hitungTPG;
    window.hitungRDA = hitungRDA;
    window.hitungPER = hitungPER;
    window.hitungPBBI = hitungPBBI;
})();
