function hitungUmur() {
    const dob = document.getElementById('dob').value;
    const tgl = document.getElementById('tanggal_ukur').value;
    if (dob && tgl) {
        const detail = hitungSelisihUsiaPresisi(new Date(`${dob}T12:00:00`), new Date(`${tgl}T12:00:00`));
        if (detail && detail.totalBulan >= 0) {
            document.getElementById('umur_bulan').value = detail.totalBulan.toFixed(1);
            document.getElementById('umur_tahun').value = (detail.totalBulan / 12).toFixed(2);
            window.lastAgeComputation = { ...detail, source: 'dates' };
            hitungKoreksiUsia();
        }
    }
}

function hitungMundurDOB(agePartsOverride){
    const umur = parseFloat(document.getElementById('umur_bulan').value);
    if (isNaN(umur) && !agePartsOverride) return;

    let tgl = document.getElementById('tanggal_ukur').value;
    if (!tgl) {
        const sekarang = new Date();
        tgl = formatTanggalInput(sekarang);
        document.getElementById('tanggal_ukur').value = tgl;
    }

    const tanggalUkur = new Date(`${tgl}T12:00:00`);
    let tanggalLahir;

    if (agePartsOverride && typeof agePartsOverride === 'object') {
        tanggalLahir = new Date(tanggalUkur.getTime());
        if (agePartsOverride.years) tanggalLahir.setFullYear(tanggalLahir.getFullYear() - agePartsOverride.years);
        if (agePartsOverride.months) tanggalLahir.setMonth(tanggalLahir.getMonth() - agePartsOverride.months);
        const hariOffset = ((agePartsOverride.weeks || 0) * 7) + (agePartsOverride.days || 0);
        if (hariOffset) tanggalLahir.setDate(tanggalLahir.getDate() - hariOffset);
        document.getElementById('umur_bulan').value = agePartsOverride.totalMonths.toFixed(1);
        document.getElementById('umur_tahun').value = (agePartsOverride.totalMonths / 12).toFixed(2);
        window.lastAgeComputation = {
            tahun: agePartsOverride.years || 0,
            bulan: agePartsOverride.months || 0,
            hari: ((agePartsOverride.weeks || 0) * 7) + (agePartsOverride.days || 0),
            totalBulan: agePartsOverride.totalMonths,
            source: 'parser'
        };
    } else {
        tanggalLahir = new Date(tanggalUkur.getTime());
        tanggalLahir.setMonth(tanggalLahir.getMonth() - Math.floor(umur));
        tanggalLahir.setDate(tanggalLahir.getDate() - Math.round((umur - Math.floor(umur)) * 30.4375));
    }

    document.getElementById('dob').value = formatTanggalInput(tanggalLahir);
    hitungUmur();
}

// ==================== KOREKSI USIA PREMATUR ====================
function hitungKoreksiUsia() {
    const umurKron = parseFloat(document.getElementById('umur_bulan').value);
    const gestasi = parseFloat(document.getElementById('usia_gestasi').value);
    const statusEl = document.getElementById('status_prematur');
    const koreksiEl = document.getElementById('umur_koreksi');

    if (isNaN(umurKron)) {
        koreksiEl.value = '';
        statusEl.value = '';
        return;
    }

    if (isNaN(gestasi) || gestasi >= 37) {
        // Aterm / tidak diisi
        koreksiEl.value = umurKron.toFixed(1);
        statusEl.value = isNaN(gestasi) ? 'Aterm (default)' : 'Aterm (' + gestasi + ' mgg)';
        return;
    }

    // Prematur: hitung koreksi
    const kekuranganMinggu = 40 - gestasi;
    const kekuranganBulan = kekuranganMinggu * 7 / 30.4375;
    const umurKoreksi = umurKron - kekuranganBulan;

    if (umurKron >= 24) {
        // Di atas 24 bulan, koreksi tidak diperlukan
        koreksiEl.value = umurKron.toFixed(1);
        statusEl.value = 'Prematur (' + gestasi + ' mgg) - Koreksi tidak diperlukan (>24 bln)';
    } else {
        koreksiEl.value = umurKoreksi.toFixed(1);
        const kat = gestasi < 28 ? 'Prematur Ekstrem' : gestasi < 32 ? 'Prematur Sangat' : gestasi < 37 ? 'Prematur' : 'Aterm';
        statusEl.value = `${kat} (${gestasi} mgg) - Koreksi: -${kekuranganBulan.toFixed(1)} bln`;
    }
}

// ==================== PARSER GENDER FLEKSIBEL ====================

function hitungSemua() {
    const gender=document.getElementById('gender').value;
    const umurKron=parseFloat(document.getElementById('umur_bulan').value);
    const umurKoreksi=parseFloat(document.getElementById('umur_koreksi').value);
    const gestasi=parseFloat(document.getElementById('usia_gestasi').value);
    const isPrematur = !isNaN(gestasi) && gestasi < 37 && umurKron < 24;
    // Gunakan umur koreksi jika prematur, else umur kronologis
    const umur = isPrematur ? umurKoreksi : umurKron;

    const bbs=parseFloat(document.getElementById('bbs').value);
    const tbRaw=parseFloat(document.getElementById('tb').value);
    const posisi=document.getElementById('posisi').value;
    const lk=parseFloat(document.getElementById('lk').value);
    const lila=parseFloat(document.getElementById('lila').value);
    const nama=document.getElementById('nama').value||'Anonim';

    let html=`<h3 style="margin-bottom:15px;">📊 Hasil Antropometri</h3>`;

    if(!gender||isNaN(umurKron)||umurKron<0){
        html+=`<div class="result-card" style="border-left-color:#dc3545;"><p>⚠️ Data tidak lengkap. Mohon isi jenis kelamin dan umur.</p></div>`;
        document.getElementById('hasil-antropometri').innerHTML=html;
        document.getElementById('hasil-antropometri').style.display='block';
        return;
    }

    const calcMode = getCalculationMode();
    const calcModeMeta = getCalculationModeMeta(calcMode);
    const refUsed = calcModeMeta.label;
    const refBadge = calcModeMeta.badge;

    let prematurHtml = '';
    if (isPrematur) {
        prematurHtml = `<details class="collapse-box" open><summary>🍼 Koreksi usia prematur aktif</summary><div class="inner"><p><strong>Usia kronologis:</strong> ${umurKron.toFixed(1)} bulan</p><p><strong>Usia koreksi:</strong> ${umurKoreksi.toFixed(1)} bulan</p><p><strong>Gestasi lahir:</strong> ${gestasi} minggu</p></div></details>`;
    }

    html += prematurHtml;
    const ageBasisLabel = getAgeBasisLabel(isPrematur);
    html += `<div class="result-card" style="border-left-color:#17a2b8;"><h3>📋 Info Referensi</h3><p><strong>Usia dipakai:</strong> ${umur.toFixed(1)} bulan (${ageBasisLabel}) | <strong>Mode:</strong> <span class="ref-toggle ${refBadge}">${refUsed}</span></p></div>`;

    const tb = !isNaN(tbRaw) ? koreksiTinggi(tbRaw, umur, posisi) : NaN;
    const hasil = calculateAnthropometryByMode(gender, umur, bbs, tb, lk, calcMode);

    // ==================== BBI KLINIS ====================
    // BBI klinis dihitung selama TB & gender tersedia, baik di rentang WHO maupun CDC.
    let bbiInfo = null;
    if (!isNaN(tb) && gender) {
        try {
            bbiInfo = hitungBBIKlinis_fn(tb, gender, umur);
        } catch (err) {
            console.error('BBI klinis error:', err);
            bbiInfo = null;
        }
    }

    // ==================== WA/HA dipisah berdasarkan engine yang aktif ====================
    const summaryAges = calculateSummaryAgesByMode(gender, umur, bbs, tb, calcMode);
    let waMonth = summaryAges.waMonth, haMonth = summaryAges.haMonth;
    let waRef = summaryAges.waRef, haRef = summaryAges.haRef;
    let waNote = summaryAges.waNote, haNote = summaryAges.haNote;
    let waSourceDetail = summaryAges.waSourceDetail, haSourceDetail = summaryAges.haSourceDetail;
    let wa = formatUmur(waMonth);
    let ha = formatUmur(haMonth);

    // ==================== %BBI ====================
    let pBBI = null;
    if (bbiInfo && Number.isFinite(bbiInfo.bbi) && !isNaN(bbs)) {
        pBBI = (bbs / bbiInfo.bbi) * 100;
    }

    // ==================== RENDER HASIL ====================

    // Helper: tentukan di antara dua garis kurva mana pasien berada
    // Untuk WHO: garis SD -3,-2,-1,0,+1,+2,+3
    // Untuk CDC: garis persentil P3,P5,P10,P25,P50,P75,P85,P90,P95,P97
    function getCurveBand(z, isWHO, pct) {
        if (isWHO) {
            const bands = [-3, -2, -1, 0, 1, 2, 3];
            const fmt = v => v === 0 ? '0 SD' : `${v > 0 ? '+' : ''}${v} SD`;
            for (let i = 0; i < bands.length - 1; i++) {
                if (z >= bands[i] && z < bands[i + 1]) {
                    return `${fmt(bands[i])} s/d ${fmt(bands[i + 1])}`;
                }
            }
            if (z < -3) return '< -3 SD';
            return '> +3 SD';
        } else {
            const p = Number(pct);
            const bands = [3, 5, 10, 25, 50, 75, 85, 90, 95, 97];
            for (let i = 0; i < bands.length - 1; i++) {
                if (p >= bands[i] && p < bands[i + 1]) {
                    return `P${bands[i]} - P${bands[i + 1]}`;
                }
            }
            if (p < 3) return '< P3';
            return '> P97';
        }
    }

    // Helper: render card ringkas — nilai + posisi kurva + status badge
    function renderCard(icon, title, refUsed, zScore, pct, classification, _rangeText, extraInfo, _refDetail) {
        const refClass = refUsed === 'WHO' ? 'who' : 'cdc';
        const isWHO = refUsed === 'WHO';
        // Nilai utama
        const primaryValue = isWHO
            ? `${zScore.toFixed(2)} SD`
            : `P${Number(pct).toFixed(1)}`;
        // Nilai sekunder (sebaliknya)
        const secondaryValue = isWHO
            ? `P${zToPercentile(zScore).toFixed(1)}`
            : `z = ${zScore.toFixed(2)}`;
        // Posisi relatif kurva
        const bandText = getCurveBand(zScore, isWHO, pct);
        const extraHtml = extraInfo ? `<span style="color:var(--text-muted);font-size:0.8em;"> · ${extraInfo}</span>` : '';
        return `<div class="result-card">
            <h3>${icon} ${title} <span class="ref-toggle ${refClass}">${refUsed}</span></h3>
            <div class="zscore-value" style="font-size:1.6em; font-weight:800; margin:6px 0;">${primaryValue} <span style="font-size:0.55em; font-weight:500; color:var(--text-muted);"> (${secondaryValue})</span></div>
            <span class="status-badge ${classification.badge}">${classification.txt}</span>
            <div style="margin-top:8px; font-size:0.88em; color:var(--text-muted);">📍 ${bandText}${extraHtml}</div>
        </div>`;
    }

    function renderBBTBMetricCard(hasil, pBBI) {
        if (hasil.bbtb_ref === 'WHO' && Number.isFinite(hasil.bbtb)) {
            return renderCard('📊', 'BB/TB', 'WHO', hasil.bbtb, zToPercentile(hasil.bbtb), classifyBBTB_WHO(hasil.bbtb), '', null, null);
        }
        if (Number.isFinite(pBBI)) {
            const cls = classifyPBBI(pBBI);
            // Tentukan band %BBI sesuai batas klinis
            let bandPBBI = '';
            if (pBBI < 70) bandPBBI = 'di bawah 70% BBI (Gizi Buruk)';
            else if (pBBI < 80) bandPBBI = 'antara 70–80% BBI';
            else if (pBBI < 90) bandPBBI = 'antara 80–90% BBI';
            else if (pBBI <= 110) bandPBBI = 'antara 90–110% BBI (Ideal)';
            else if (pBBI <= 120) bandPBBI = 'antara 110–120% BBI';
            else bandPBBI = 'di atas 120% BBI (Obesitas)';
            return `<div class="result-card">
                <h3>📊 BB/TB <span class="ref-toggle cdc">CDC</span></h3>
                <div class="zscore-value" style="font-size:1.6em; font-weight:800; margin:6px 0;">${pBBI.toFixed(1)}% BBI</div>
                <span class="status-badge ${cls.badge}">${cls.txt}</span>
                <div style="margin-top:8px; font-size:0.88em; color:var(--text-muted);">📍 ${bandPBBI}</div>
            </div>`;
        }
        return '';
    }


    // TAMPILAN DETAIL PERHITUNGAN (COLLAPSIBLE)
    html += '<details class="collapse-box" style="margin-bottom: 20px; background: #fdfdfd; border: 1px solid #ddd; border-radius: 8px; padding: 15px;"><summary style="font-weight:bold; cursor:pointer; font-size:1.05em; color: var(--primary-color);">🔍 Lihat Detail Perhitungan Z-Score / Persentil</summary><div class="inner" style="margin-top: 15px;">';

    let summaryBBU = '-', summaryTBU = '-', summaryIMTU = '-', summaryBBTB = '-';

    // BB/U
    if (hasil.bbu !== undefined) {
        let cls, rangeText, pctVal;
        if (hasil.bbu_ref === 'WHO') {
            cls = classifyBBU_WHO(hasil.bbu);
            rangeText = getRangeWHO(hasil.bbu, 'bbu');
        } else {
            pctVal = hasil.bbu_pct !== undefined ? hasil.bbu_pct : zToPercentile(hasil.bbu);
            cls = classifyCDC_Percentile(pctVal, 'weight');
            rangeText = getRangeCDC(pctVal, 'weight');
        }
        summaryBBU = rangeText;
        html += renderCard('⚖️', 'BB/U (Weight-for-Age)', hasil.bbu_ref, hasil.bbu, pctVal, cls, rangeText, null, hasil.bbu_ref_detail);
    }

    // TB/U
    if (hasil.tbu !== undefined) {
        let cls, rangeText, pctVal;
        if (hasil.tbu_ref === 'WHO') {
            cls = classifyTBU_WHO(hasil.tbu);
            rangeText = getRangeWHO(hasil.tbu, 'tbu');
        } else {
            pctVal = hasil.tbu_pct !== undefined ? hasil.tbu_pct : zToPercentile(hasil.tbu);
            cls = classifyCDC_Percentile(pctVal, 'stature');
            rangeText = getRangeCDC(pctVal, 'stature');
        }
        summaryTBU = rangeText;
        html += renderCard('📏', 'TB/U (Height-for-Age)', hasil.tbu_ref, hasil.tbu, pctVal, cls, rangeText, null, hasil.tbu_ref_detail);
    }

    // IMT/U
    if (hasil.imtu !== undefined) {
        let cls, rangeText, pctVal;
        if (hasil.imtu_ref === 'WHO') {
            cls = classifyIMTU_WHO(hasil.imtu);
            rangeText = getRangeWHO(hasil.imtu, 'imtu');
        } else {
            pctVal = hasil.imtu_pct !== undefined ? hasil.imtu_pct : zToPercentile(hasil.imtu);
            cls = classifyCDC_Percentile(pctVal, 'bmi');
            rangeText = getRangeCDC(pctVal, 'bmi');
        }
        summaryIMTU = rangeText;
        html += renderCard('📐', 'IMT/U (BMI-for-Age)', hasil.imtu_ref, hasil.imtu, pctVal, cls, rangeText, `IMT: ${hasil.imt_value.toFixed(2)} kg/m²`, hasil.imtu_ref_detail);
    }

    // Gunakan nilai persen BBI untuk Ringkasan BB/TB selalu
    // (sesuai permintaan user)

    const bbtbMetricHtml = renderBBTBMetricCard(hasil, pBBI);
    if (bbtbMetricHtml) {
        html += bbtbMetricHtml;
        if (Number.isFinite(pBBI)) {
            let pBBIText = '';
            if (pBBI < 70) pBBIText = '< 70% BBI (Gizi Buruk)';
            else if (pBBI < 80) pBBIText = '70-80% BBI (Gizi Kurang)';
            else if (pBBI < 90) pBBIText = '80-90% BBI (Gizi Kurang/Normal)';
            else if (pBBI <= 110) pBBIText = '90-110% BBI (Normal)';
            else if (pBBI <= 120) pBBIText = '110-120% BBI (Overweight)';
            else pBBIText = '> 120% BBI (Obesitas)';
            summaryBBTB = `${pBBI.toFixed(1)}% (${pBBIText})`;
        }
    }

    // LILA
    let lilaCls = null;
    if (!isNaN(lila)) {
        lilaCls = classifyLILA(lila, umur);
        const refRange = (umur >= 6 && umur < 60)
            ? '&lt;11.5 SAM | 11.5-12.4 MAM | ≥12.5 Normal'
            : '&lt;23.5 cm = KEK (WUS/Bumil)';
        html += `<div class="result-card"><h3>💪 LILA (MUAC)</h3>
            <div class="zscore-value">${lila.toFixed(1)} cm</div>
            <span class="status-badge ${lilaCls.badge}">${lilaCls.txt}</span>
            <div class="range-info"><strong>Rentang:</strong> ${refRange}</div></div>`;
    }

    html += '</div></details>';

    // ==================== RINGKASAN RINGKAS ====================
    const statusUtama = getStatusUtama(hasil, lilaCls, umur, waMonth, haMonth, umurKron, pBBI);

    let ringkasanHtml = `<div class="result-card" style="border-left-color:#28a745; background:#f0fdf4;">
        <h3>📋 Ringkasan</h3>
        <table style="width:100%; font-size:1.05em; line-height:1.6;">
            <tr><td style="padding:4px 0; width:30%;"><strong>BB/U</strong></td><td>: ${summaryBBU}</td></tr>
            <tr><td style="padding:4px 0;"><strong>TB/U</strong></td><td>: ${summaryTBU}</td></tr>
            <tr><td style="padding:4px 0;"><strong>BB/TB</strong></td><td>: ${summaryBBTB}</td></tr>
            <tr><td style="padding:4px 0;"><strong>IMT/U</strong></td><td>: ${summaryIMTU}</td></tr>
            <tr><td style="padding:4px 0;"><strong>HA</strong></td><td>: ${ha || '-'}</td></tr>
            <tr><td style="padding:4px 0;"><strong>WA</strong></td><td>: ${wa || '-'}</td></tr>
            <tr><td style="padding:4px 0;"><strong>BBI</strong></td><td>: ${bbiInfo && Number.isFinite(bbiInfo.bbi) ? bbiInfo.bbi.toFixed(2) + ' kg' : '-'}</td></tr>
            <tr style="border-top:2px solid #28a745;"><td style="padding:10px 0 4px 0;"><strong>Status</strong></td><td style="padding-top:10px;">${statusUtama.html}</td></tr>
        </table>
    </div>`;
    html += ringkasanHtml;

    // Add Audit Trail back
      if (typeof renderAuditTrailCard === 'function') {
          const audit = {
              modeLabel: hasil.calculation_mode_label,
              ageBasisLabel: hasil.age_basis_label,
              ageUsedMonth: hasil.umur_dipakai,
              bbuRef: hasil.bbu_ref,
              tbuRef: hasil.tbu_ref,
              imtuRef: hasil.imtu_ref,
              waRef: hasil.waRef,
              haRef: hasil.haRef,
              bbiRef: hasil.bbi_ref,
              bbuRefDetail: hasil.bbu_ref_detail,
              tbuRefDetail: hasil.tbu_ref_detail,
              imtuRefDetail: hasil.imtu_ref_detail,
              waSourceDetail: hasil.waSourceDetail,
              haSourceDetail: hasil.haSourceDetail,
              bbiSourceDetail: hasil.bbi_source_detail,
              waNote: hasil.waNote,
              haNote: hasil.haNote,
              bbiNote: hasil.bbi_note
          };
          html += renderAuditTrailCard(audit);
      }

    // Pediatric advice card
    const adviceHtml = getPediatricAdvice(statusUtama.code, window.hasilSementara);
    html += adviceHtml;

    // Background chart download section (Premium Growth Curve downloads)
    let downloadHtml = `
    <div class="result-card curve-download-card" style="border-left: 5px solid #10b981; background: var(--card-bg); border-radius: 16px; padding: 20px; margin-top: 20px; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15em; font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--text-color); margin-top: 0;">
            <span>📊</span> <span>Unduh Laporan Kurva Pertumbuhan</span>
        </h3>
        <p style="font-size: 0.9em; color: var(--text-muted); margin-bottom: 15px; line-height: 1.5;">
            Unduh kurva pertumbuhan anak berstandar medis dengan titik pengukuran pasien yang diplot secara akurat ke dalam file gambar beresolusi tinggi (PNG).
        </p>
        <div class="curve-download-buttons" style="display: flex; flex-wrap: wrap; gap: 10px;">
    `;

    const ageVal = Number(umur);
    const activeRef = hasil.bbu_ref || (ageVal > 60 ? 'CDC' : 'WHO');
    
    if (activeRef === 'WHO') {
        downloadHtml += `
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('bbu')">⚖️ Kurva BB/U</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('tbu')">📏 Kurva TB/U</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('imtu')">📐 Kurva IMT/U</button>
        `;
        if (Number.isFinite(tb) && Number.isFinite(bbs)) {
            downloadHtml += `<button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('bbpb')">📊 Kurva BB/TB</button>`;
        }
        if (Number.isFinite(lk)) {
            downloadHtml += `<button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('lku')">👶 Kurva LK/U</button>`;
        }
    } else {
        downloadHtml += `
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('weight')">⚖️ Kurva BB/U</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('stature')">📏 Kurva TB/U</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadChartBackground('bmi')">📐 Kurva IMT/U</button>
        `;
    }

    downloadHtml += `
            <button class="btn btn-primary btn-sm" onclick="downloadAllChartsBackground()" style="margin-left: auto;">📥 Unduh Semua Kurva</button>
        </div>
    </div>`;
    html += downloadHtml;

    // ==================== SIMPAN HASIL ====================
    window.hasilSementara = {
        nama, gender, umur_bulan: umurKron, umur_dipakai: umur,
        isPrematur, gestasi: isNaN(gestasi)?null:gestasi, umurKoreksi: isPrematur?umurKoreksi:null,
        tanggal_lahir: document.getElementById('dob').value || null,
        tanggal_ukur: document.getElementById('tanggal_ukur').value || null,
        umur_detail: window.lastAgeComputation || window.lastParsedAgeParts || null,
        bbs: isNaN(bbs)?null:bbs,
        tb: isNaN(tb)?null:tb,
        tb_raw: isNaN(tbRaw)?null:tbRaw,
        lk: isNaN(lk)?null:lk,
        lila: isNaN(lila)?null:lila,
        bbu: hasil.bbu, tbu: hasil.tbu, bbtb: hasil.bbtb, imtu: hasil.imtu, lku: hasil.lku,
        bbu_ref: hasil.bbu_ref, tbu_ref: hasil.tbu_ref, imtu_ref: hasil.imtu_ref, bbtb_ref: hasil.bbtb_ref,
        bbu_ref_detail: hasil.bbu_ref_detail || null,
        tbu_ref_detail: hasil.tbu_ref_detail || null,
        imtu_ref_detail: hasil.imtu_ref_detail || null,
        bbtb_ref_detail: hasil.bbtb_ref_detail || null,
        bbu_pct: hasil.bbu_pct, tbu_pct: hasil.tbu_pct, imtu_pct: hasil.imtu_pct,
        imt_value: hasil.imt_value,
        wa, ha, waMonth, haMonth, waRef, haRef, waNote, haNote, waSourceDetail, haSourceDetail,
        bbi: bbiInfo && Number.isFinite(bbiInfo.bbi) ? bbiInfo.bbi : null,
        bbi_ha: bbiInfo ? bbiInfo.ha : null,
        bbi_ref: bbiInfo ? bbiInfo.ref : null,
        bbi_source_detail: bbiInfo ? bbiInfo.sourceDetail : null,
        bbi_note: bbiInfo ? bbiInfo.note : null,
        calculation_mode: calcMode,
        calculation_mode_label: refUsed,
        age_basis_label: ageBasisLabel,
        pBBI,
        bbtb_metric: Number.isFinite(hasil.bbtb) ? hasil.bbtb : (Number.isFinite(pBBI) ? pBBI : null),
        bbtb_metric_mode: Number.isFinite(hasil.bbtb) ? 'who_zscore' : (Number.isFinite(pBBI) ? 'cdc_pct_bbi' : null),
        ref_used: refUsed,
        status_utama_html: statusUtama.html,
        status_utama_text: (statusUtama.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    };

    // Auto-fill tab gizi
    const setValueIfExists = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
    if (!isNaN(umur)) setValueIfExists('bbi_umur', umur.toFixed(1));
    if (!isNaN(tb)) setValueIfExists('bbi_tb', tb.toFixed(1));
    if (gender) {
        setValueIfExists('bbi_gender', gender);
        setValueIfExists('tpg_gender', gender);
        setValueIfExists('gender_grafik', gender);
    }
    if (bbiInfo && Number.isFinite(bbiInfo.bbi)) setValueIfExists('rda_bbi', bbiInfo.bbi.toFixed(2));
    if (!isNaN(bbs)) setValueIfExists('rda_bbs', bbs);
    if (!isNaN(haMonth)) setValueIfExists('rda_umur', (haMonth/12).toFixed(1));
    else if (!isNaN(umur)) setValueIfExists('rda_umur', (umur/12).toFixed(1));
    var ayah = parseFloat((document.getElementById('tb_ayah') || {}).value);
    var ibu = parseFloat((document.getElementById('tb_ibu') || {}).value);
    if (!isNaN(ayah)) setValueIfExists('tpg_ayah', ayah);
    if (!isNaN(ibu)) setValueIfExists('tpg_ibu', ibu);
    if (window.renderRDAAdjustmentTable) {
        try { window.renderRDAAdjustmentTable(window.hasilSementara); } catch (e) { console.error('renderRDAAdjustmentTable error:', e); }
    }

    document.getElementById('hasil-antropometri').innerHTML=html;
    document.getElementById('hasil-antropometri').style.display='block';

    // Auto-refresh grafik setelah hitung (bug fix: supaya saat user buka tab grafik, langsung tampil)
    try {
        updateIndikatorGrafik();
    } catch(e) { console.error('updateIndikatorGrafik error:', e); }

    // Auto-hitung TPG jika data orang tua terisi
    if (!isNaN(ayah) && !isNaN(ibu)) {
        try { hitungTPG(); } catch(e) {}
    }
}

// ==================== STATUS UTAMA (Diagnosis Ringkas) ====================
// Prioritas WHO/CDC:
//  1. Gizi Buruk (SAM): BB/TB < -3 SD ATAU LILA < 11.5 cm (6-59 bln)
//  2. Gizi Kurang (MAM): -3 ≤ BB/TB < -2 SD ATAU 11.5 ≤ LILA < 12.5 cm
//  3. Obesitas/Overweight (BB/TB atau IMT/U atau persentil BMI CDC)
//  4. Stunting klinis (TB/U < -2 DAN HA<WA<Usia)
//  5. Normal Weight to Length/Height (BB/TB normal + TB/U stunted)
//  6. Stunting antropometri murni
//  7. %BBI fallback (anak >5 thn tanpa BB/TB)
//  8. Gizi Baik (default jika BB/TB normal dan TB/U normal)
function getStatusUtama(hasil, lilaCls, umur, waMonth, haMonth, umurKron, pBBI) {
    const hasBBTB = hasil.bbtb !== undefined && Number.isFinite(hasil.bbtb);
    const hasIMTU = hasil.imtu !== undefined && Number.isFinite(hasil.imtu);
    const hasTBU = hasil.tbu !== undefined && Number.isFinite(hasil.tbu);
    const imtuPctFinal = hasIMTU ? (hasil.imtu_pct !== undefined ? hasil.imtu_pct : zToPercentile(hasil.imtu)) : null;
    const usingCDC_BMI = (hasil.imtu_ref === 'CDC');

    // 1. Gizi Buruk (SAM)
    const hasBBTBSevere = hasBBTB && hasil.bbtb < -3;
    const hasLILASevere = lilaCls && lilaCls.txt.includes('SAM');
    if (hasBBTBSevere || hasLILASevere) {
        return { code: 'SAM', html: `<span class="status-badge status-severe">🚨 Gizi Buruk (SAM)</span>` };
    }

    // 2. Gizi Kurang (MAM)
    if ((hasBBTB && hasil.bbtb < -2 && hasil.bbtb >= -3) || (lilaCls && lilaCls.txt.includes('MAM'))) {
        return { code: 'MAM', html: `<span class="status-badge status-moderate">⚠️ Gizi Kurang (MAM)</span>` };
    }

    // 3. Obesitas / Overweight
    // Untuk WHO: BB/TB atau IMT/U > +3 SD = obesitas, > +2 ≤ +3 = overweight ("Gizi Lebih")
    // Untuk CDC BMI: ≥P95 = obesity, P85-<P95 = overweight
    const isObeseWHO = (hasBBTB && hasil.bbtb > 3) || (hasIMTU && !usingCDC_BMI && hasil.imtu > 3);
    const isOverweightWHO = (hasBBTB && hasil.bbtb > 2 && hasil.bbtb <= 3) || (hasIMTU && !usingCDC_BMI && hasil.imtu > 2 && hasil.imtu <= 3);
    const isObeseCDC = usingCDC_BMI && imtuPctFinal !== null && imtuPctFinal >= 95;
    const isOverweightCDC = usingCDC_BMI && imtuPctFinal !== null && imtuPctFinal >= 85 && imtuPctFinal < 95;

    if (isObeseWHO || isObeseCDC) {
        return { code: 'OBESITY', html: `<span class="status-badge status-obese">🔴 Obesitas</span>` };
    }
    if (isOverweightWHO || isOverweightCDC) {
        return { code: 'OVERWEIGHT', html: `<span class="status-badge status-risk">⚠️ Gizi Lebih (Overweight)</span>` };
    }

    // 4. Stunting klinis
    const isStunted = hasTBU && hasil.tbu < -2;
    const isStuntedSev = hasTBU && hasil.tbu < -3;
    let isStuntingKlinis = false;
    if (isStunted && haMonth !== null && waMonth !== null && umurKron) {
        isStuntingKlinis = haMonth < waMonth && waMonth < umurKron;
    }

    // 5. Normal Weight to Length/Height
    const isBBTBNormal = hasBBTB && hasil.bbtb >= -2 && hasil.bbtb <= 2;
    if (isBBTBNormal && isStunted) {
        const label = isStuntingKlinis
            ? (isStuntedSev ? 'Severely Stunting (Klinis)' : 'Stunting (Klinis)')
            : (isStuntedSev ? 'Severely Stunted' : 'Stunted');
        return {
            code: 'NWL_STUNTED',
            html: `<span class="status-badge status-info">📊 Normal Weight to Length/Height</span> + <span class="status-badge ${isStuntedSev?'status-severe':'status-moderate'}">${label}</span>`
        };
    }

    // 6. Stunting saja
    if (isStunted) {
        if (isStuntingKlinis) {
            return {
                code: 'STUNTING_KLINIS',
                html: `<span class="status-badge ${isStuntedSev?'status-severe':'status-moderate'}">📉 ${isStuntedSev?'Severely ':''}Stunting (Klinis)</span>`
            };
        }
        return {
            code: 'STUNTED',
            html: `<span class="status-badge ${isStuntedSev?'status-severe':'status-moderate'}">📏 ${isStuntedSev?'Severely ':''}Stunted (Antropometri)</span>`
        };
    }

    // 7. %BBI fallback (>5 thn tanpa BB/TB)
    if (umur > 60 && pBBI !== null && !hasBBTB) {
        const cls = classifyPBBI(pBBI);
        return { code: 'PBBI_' + cls.txt.replace(/\s/g, '_').toUpperCase(), html: `<span class="status-badge ${cls.badge}">${cls.txt}</span>` };
    }

    // 8. Gizi Baik
    if (isBBTBNormal && hasTBU && !isStunted) {
        return { code: 'GIZI_BAIK', html: `<span class="status-badge status-normal">✅ Gizi Baik</span>` };
    }

    // 9. Pada anak >5 thn dengan BMI/U CDC normal (P5-P85) dan TB/U normal
    if (umur > 60 && usingCDC_BMI && imtuPctFinal !== null && imtuPctFinal >= 5 && imtuPctFinal < 85 && hasTBU && !isStunted) {
        return { code: 'GIZI_BAIK_BMI', html: `<span class="status-badge status-normal">✅ Healthy Weight</span>` };
    }
    // 10. Underweight pada anak >5 thn
    if (umur > 60 && usingCDC_BMI && imtuPctFinal !== null && imtuPctFinal < 5) {
        return { code: 'BMI_UNDERWEIGHT', html: `<span class="status-badge status-severe">🔥 Underweight</span>` };
    }

    // Fallback
    return { code: 'INCOMPLETE', html: `<span class="status-badge status-info">Evaluasi Lanjutan</span>` };
}

if (typeof window !== 'undefined') {
    window.getCalculationModeLabel = getCalculationModeLabel;
    window.getAgeBasisLabel = getAgeBasisLabel;
}

// ==================== DIAGNOSIS KOMPOSIT (legacy - tidak dipakai) ====================
function buildDiagnosis_unused(hasil, lilaCls, umur, waMonth, haMonth, umurKron, pBBI, isPrematur) {
    let diagList = [];
    let recList = [];

    // 1. GIZI BURUK: BB/TB < -3 dan/atau LILA < 11.5 (6-59 bln)
    const hasBBTBSevere = hasil.bbtb !== undefined && hasil.bbtb < -3;
    const hasLILASevere = lilaCls && lilaCls.txt.includes('SAM');
    if (hasBBTBSevere || hasLILASevere) {
        let kriteria = [];
        if (hasBBTBSevere) kriteria.push(`BB/TB = ${hasil.bbtb.toFixed(2)} SD`);
        if (hasLILASevere) kriteria.push(`LILA < 11.5 cm`);
        diagList.push({
            icon: '🚨',
            txt: 'Gizi Buruk (Severe Acute Malnutrition / SAM)',
            badge: 'status-severe',
            detail: `Kriteria terpenuhi: ${kriteria.join(' dan ')}`
        });
        recList.push('Rujuk segera untuk terapi nutrisi (F-75, F-100), antibiotik profilaksis, dan monitoring ketat.');
    }
    // 2. Gizi Kurang (MAM)
    else if ((hasil.bbtb !== undefined && hasil.bbtb < -2 && hasil.bbtb >= -3) || (lilaCls && lilaCls.txt.includes('MAM'))) {
        diagList.push({
            icon: '⚠️',
            txt: 'Gizi Kurang (Moderate Acute Malnutrition / MAM)',
            badge: 'status-moderate',
            detail: `BB/TB = ${hasil.bbtb !== undefined ? hasil.bbtb.toFixed(2)+' SD' : '-'}`
        });
        recList.push('Terapi nutrisi: suplementasi makanan padat energi, edukasi gizi ke orang tua.');
    }

    // 3. STUNTING: TB/U < -2 DAN HA < WA < Usia Kronologis
    const isStunted = hasil.tbu !== undefined && hasil.tbu < -2;
    const isStuntedSevere = hasil.tbu !== undefined && hasil.tbu < -3;
    let isStuntingKlinis = false;
    if (isStunted && haMonth !== null && waMonth !== null && umurKron) {
        isStuntingKlinis = haMonth < waMonth && waMonth < umurKron;
    }
    if (isStuntingKlinis) {
        diagList.push({
            icon: '📉',
            txt: isStuntedSevere ? 'Severely Stunting (Malnutrisi Kronis Berat)' : 'Stunting (Malnutrisi Kronis)',
            badge: isStuntedSevere ? 'status-severe' : 'status-moderate',
            detail: `TB/U = ${hasil.tbu.toFixed(2)} SD; HA (${formatUmur(haMonth)}) < WA (${formatUmur(waMonth)}) < Usia Kronologis (${formatUmur(umurKron)})`
        });
        recList.push('Intervensi gizi kronis: suplemen mikronutrien, terapi nutrisi jangka panjang, pemantauan growth velocity.');
    } else if (isStunted) {
        diagList.push({
            icon: '📏',
            txt: isStuntedSevere ? 'Severely Stunted (Antropometri)' : 'Stunted (Antropometri)',
            badge: isStuntedSevere ? 'status-severe' : 'status-moderate',
            detail: `TB/U = ${hasil.tbu.toFixed(2)} SD. Catatan: Stunted belum tentu stunting klinis (belum memenuhi HA<WA<usia).`
        });
        recList.push('Evaluasi lebih lanjut: riwayat gizi, infeksi, penyakit penyerta.');
    }

    // 4. NORMAL WEIGHT TO LENGTH/HEIGHT: BB/TB normal TAPI TB/U stunted
    const isBBTBNormal = hasil.bbtb !== undefined && hasil.bbtb >= -2 && hasil.bbtb <= 2;
    if (isBBTBNormal && isStunted) {
        diagList.push({
            icon: '📊',
            txt: 'Normal Weight to Length/Height (dengan Stunting)',
            badge: 'status-info',
            detail: `BB/TB = ${hasil.bbtb.toFixed(2)} SD (normal), namun TB/U = ${hasil.tbu.toFixed(2)} SD (stunted). Bukan "gizi baik"!`
        });
    } else if (isBBTBNormal && !isStunted && hasil.tbu !== undefined) {
        diagList.push({
            icon: '✅',
            txt: 'Gizi Baik',
            badge: 'status-normal',
            detail: `BB/TB normal (${hasil.bbtb.toFixed(2)} SD) dan TB/U normal (${hasil.tbu.toFixed(2)} SD).`
        });
    }

    // 5. OVERWEIGHT/OBESITAS: BB/TB > 2 atau >3
    if (hasil.bbtb !== undefined && hasil.bbtb > 3) {
        diagList.push({
            icon: '⚠️',
            txt: 'Obesitas',
            badge: 'status-obese',
            detail: `BB/TB = ${hasil.bbtb.toFixed(2)} SD > +3 SD. Konfirmasi via IMT/U.`
        });
        recList.push('Intervensi gizi: konseling diet, aktivitas fisik, skrining komorbid.');
    } else if (hasil.bbtb !== undefined && hasil.bbtb > 2) {
        diagList.push({
            icon: '⚠️',
            txt: 'Gizi Lebih (Overweight)',
            badge: 'status-risk',
            detail: `BB/TB = ${hasil.bbtb.toFixed(2)} SD di +2 hingga +3 SD. Konfirmasi via IMT/U.`
        });
    }

    // 6. %BBI CDC (>5 tahun)
    if (umur > 60 && pBBI !== null) {
        const clsPBBI = classifyPBBI(pBBI);
        diagList.push({
            icon: '📐',
            txt: `${clsPBBI.txt} (berdasarkan %BBI CDC)`,
            badge: clsPBBI.badge,
            detail: `%BBI = ${pBBI.toFixed(1)}% (BBS/BBI × 100%)`
        });
    }

    // 7. Prematur note
    if (isPrematur) {
        diagList.push({
            icon: '🍼',
            txt: 'Bayi Prematur (usia koreksi diterapkan)',
            badge: 'status-info',
            detail: `Perhitungan menggunakan usia koreksi untuk akurasi Z-score.`
        });
    }

    if (diagList.length === 0) return '';

    let diagHtml = `<div class="diagnosis-card">
        <h3>🎯 Diagnosis Klinis Komposit</h3>`;
    diagList.forEach(d => {
        diagHtml += `<div style="margin:12px 0; padding:10px; border-left:3px solid #667eea; background:#f8f9fa; border-radius:5px;">
            <div style="font-size:1.1em;"><strong>${d.icon} <span class="status-badge ${d.badge}">${d.txt}</span></strong></div>
            <div style="margin-top:6px; font-size:0.9em; color:#555;">${d.detail}</div>
        </div>`;
    });
    if (recList.length > 0) {
        diagHtml += `<div style="margin-top:15px; padding:12px; background:#fff3cd; border-radius:8px; border-left:4px solid #ffc107;">
            <strong>📝 Rekomendasi:</strong>
            <ul style="margin:8px 0 0 20px;">
                ${recList.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </div>`;
    }
    diagHtml += `</div>`;
        return diagHtml;
}

// ==================== SVG PROGRESS GAUGE & ADVICE GENERATORS ====================
function drawZScoreGauge(zScore, percentile, indicatorType, refUsed, classification) {
    let colorClass = 'normal';
    if (classification && classification.badge) {
        if (classification.badge.includes('severe')) colorClass = 'severe';
        else if (classification.badge.includes('moderate')) colorClass = 'moderate';
        else if (classification.badge.includes('risk') || classification.badge.includes('warning')) colorClass = 'warning';
        else if (classification.badge.includes('obese')) colorClass = 'obese';
        else if (classification.badge.includes('info')) colorClass = 'info';
    }
    const pct = percentile !== undefined && Number.isFinite(percentile) 
        ? percentile 
        : (Number.isFinite(zScore) ? zToPercentile(zScore) : 50);
    const boundedPct = Math.max(0, Math.min(100, pct));
    const circumference = 2 * Math.PI * 38;
    const strokeDashoffset = circumference - (boundedPct / 100) * circumference;
    const zText = Number.isFinite(zScore) ? `${zScore > 0 ? '+' : ''}${zScore.toFixed(2)} SD` : 'N/A';
    const pText = Number.isFinite(pct) ? `P${pct.toFixed(0)}` : 'N/A';
    const displayValue = refUsed === 'WHO' ? zText : pText;
    const subLabel = refUsed === 'WHO' ? 'Z-Score' : 'Persentil';
    return `
    <div class="gauge-card">
        <div class="gauge-card-title">${indicatorType}</div>
        <div class="gauge-svg-wrap">
            <svg class="gauge-svg" viewBox="0 0 100 100">
                <circle class="gauge-bg" cx="50" cy="50" r="38"></circle>
                <circle class="gauge-val ${colorClass}" cx="50" cy="50" r="38" 
                    style="stroke-dasharray: ${circumference.toFixed(2)}; stroke-dashoffset: ${strokeDashoffset.toFixed(2)};">
                </circle>
            </svg>
            <div class="gauge-text">
                ${displayValue}
                <small>${subLabel}</small>
            </div>
        </div>
        <div class="gauge-status" style="color: var(--color-${colorClass});">${classification.txt || 'Normal'}</div>
    </div>`;
}

function getPediatricAdvice(code, patient) {
    let title = 'Rekomendasi Nutrisi';
    let icon = '🍎';
    let items = [];
    if (code === 'SAM') {
        title = 'Tata Laksana Gizi Buruk (SAM)';
        icon = '🚨';
        items = [
            'Rujuk segera ke Puskesmas/Rumah Sakit atau Therapeutic Feeding Center terdekat.',
            'Berikan formula stabilisasi F-75 atau Resomal jika disertai gejala dehidrasi klinis.',
            'Berikan makanan formula terapi RUTF (Ready-to-Use Therapeutic Food) secara terarah.',
            'Berikan antibiotik profilaksis dan suplemen Vitamin A dosis tinggi sesuai instruksi medis.'
        ];
    } else if (code === 'MAM') {
        title = 'Tata Laksana Gizi Kurang (MAM)';
        icon = '⚠️';
        items = [
            'Suplementasi asupan nutrisi padat kalori kaya protein hewani (susu, telur, ikan, ayam).',
            'Evaluasi praktik Pemberian Makanan Bayi dan Anak (PMBA) bersama konselor laktasi/gizi.',
            'Skrining ketat potensi penyakit penyerta (TBC anak, cacingan, ISK kronis).',
            'Pantau kenaikan berat badan berkala di fasilitas kesehatan setiap 2 minggu sekali.'
        ];
    } else if (code === 'OBESITY') {
        title = 'Modifikasi Gaya Hidup: Obesitas Anak';
        icon = '🔴';
        items = [
            'Konseling gizi seimbang: batasi asupan gula sederhana, lemak jenuh, dan makanan cepat saji.',
            'Tingkatkan aktivitas fisik aktif intensitas sedang minimal 60 menit setiap hari.',
            'Batasi sedentary lifestyle / screen time (menonton TV, main HP) maksimal 1-2 jam sehari.',
            'Fokus pada laju pertumbuhan tinggi badan yang optimal; hindari diet penurunan berat badan ekstrem.'
        ];
    } else if (code === 'OVERWEIGHT') {
        title = 'Pencegahan Obesitas: Overweight';
        icon = '⚠️';
        items = [
            'Batasi minuman manis kemasan, jus buah berlebih, serta camilan berkalori tinggi.',
            'Biasakan konsumsi sayuran dan buah segar minimal 3 porsi sehari.',
            'Latih kebiasaan makan teratur bersama keluarga tanpa distraksi gadget.'
        ];
    } else if (code && (code.includes('STUNT') || code.includes('STUNTED'))) {
        title = 'Intervensi Stunting / Malnutrisi Kronis';
        icon = '📉';
        items = [
            'Prioritaskan konsumsi asam amino esensial lengkap dari protein hewani tinggi bioavailabilitas.',
            'Perbaiki higiene sanitasi lingkungan rumah dan akses air minum bersih keluarga.',
            'Berikan suplementasi Zat Besi (bila ada anemia), Seng (Zinc), dan Vitamin A sesuai anjuran.',
            'Lakukan stimulasi psikososial aktif sesuai tahapan tumbuh kembang anak.'
        ];
    } else {
        title = 'Pemeliharaan Gizi Baik (Healthy Weight)';
        icon = '✅';
        items = [
            'Lanjutkan pola makan gizi seimbang berbasis Isi Piringku.',
            'Pantau pertumbuhan berkala di Posyandu setiap bulan sekali.',
            'Pastikan kecukupan waktu istirahat tidur malam hari dan imunisasi dasar lengkap.'
        ];
    }
    return `
    <div class="advice-card" style="margin-top: 20px; border-left: 5px solid var(--primary-color); background: var(--card-bg); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
        <div class="advice-title" style="font-size: 1.15em; font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span>${icon}</span> <span>${title}</span>
        </div>
        <div class="advice-content" style="font-size: 0.95em; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 8px;">Rekomendasi Tindakan Pediatrik:</strong>
            <ul class="advice-list" style="margin: 0; padding-left: 20px; color: var(--text-color);">
                ${items.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
            </ul>
        </div>
    </div>`;
}

// ========================================================================
// ==================== PARSER =============================================
// ========================================================================

// Expose helper utama ke window untuk testing & integrasi
if (typeof window !== 'undefined') {
    window.getLMS = getLMS;
    window.getLMS_CDC = getLMS_CDC;
    window.hitungZScore = hitungZScore;
    window.calculateXFromZ = calculateXFromZ;
    window.percentileToZ = percentileToZ;
    window.zToPercentile = zToPercentile;
    window.findAgeForMedian_WHO = findAgeForMedian_WHO;
    window.findAgeForMedian_CDC = findAgeForMedian_CDC;
    window.getCalculationMode = getCalculationMode;
    window.getCalculationModeMeta = getCalculationModeMeta;
    window.calculateHAWhoStrict = calculateHAWhoStrict;
    window.calculateWAWhoStrict = calculateWAWhoStrict;
    window.calculateHACDC = calculateHACDC;
    window.calculateWACDC = calculateWACDC;
    window.calculateBBIWhoSeparated = calculateBBIWhoSeparated;
    window.calculateBBICDCSeparated = calculateBBICDCSeparated;
    window.calculateSummaryAgesByMode = calculateSummaryAgesByMode;
    window.calculateAnthropometryByMode = calculateAnthropometryByMode;
    window.hitungBBIKlinis_fn = hitungBBIKlinis_fn;
    window.classifyCDC_Percentile = classifyCDC_Percentile;
    window.classifyBBU_WHO = classifyBBU_WHO;
    window.classifyTBU_WHO = classifyTBU_WHO;
    window.classifyBBTB_WHO = classifyBBTB_WHO;
    window.classifyIMTU_WHO = classifyIMTU_WHO;
    window.classifyPBBI = classifyPBBI;
    window.classifyLILA = classifyLILA;
    window.classifyLK = classifyLK;
    window.formatUmur = formatUmur;
    window.koreksiTinggi = koreksiTinggi;
    window.parseGender = parseGender;
    window.getRangeWHO = getRangeWHO;
    window.getRangeCDC = getRangeCDC;
    window.getStatusUtama = getStatusUtama;
    window.hitungSemua = hitungSemua;
    window.hitungUmur = hitungUmur;
    window.hitungMundurDOB = hitungMundurDOB;
    window.hitungKoreksiUsia = hitungKoreksiUsia;
    window.drawZScoreGauge = drawZScoreGauge;
    window.getPediatricAdvice = getPediatricAdvice;
}
