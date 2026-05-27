// ============================================================================
// WHO CHART MODULE — Official Medical Form Appearance
// Matching WHO Child Growth Standards visual style (0–5 tahun):
//   Boys: green palette | Girls: red/rose palette
//   Full age range (0–60 bulan) | SD curves labeled at right end
//   Shaded normal band between -2 SD and +2 SD
// ============================================================================
(function () {

    // ── SD Curve visual configurations (matching WHO official publication) ───
    // Median is thickest/solid. ±1 SD lighter dashed. ±2 SD orange dashed. ±3 SD red dashed.
    const SD_CONFIGS = [
        { sd: -3, borderColor: '#DC2626', width: 1.4, dash: [7, 5],  endLabel: '-3 SD' },
        { sd: -2, borderColor: '#EA580C', width: 1.7, dash: [5, 4],  endLabel: '-2 SD' },
        { sd: -1, borderColor: '#CA8A04', width: 1.4, dash: [4, 3],  endLabel: '-1 SD' },
        { sd:  0, borderColor: null,      width: 2.8, dash: [],       endLabel: 'Median' },  // null → palette.median
        { sd: +1, borderColor: '#CA8A04', width: 1.4, dash: [4, 3],  endLabel: '+1 SD' },
        { sd: +2, borderColor: '#EA580C', width: 1.7, dash: [5, 4],  endLabel: '+2 SD' },
        { sd: +3, borderColor: '#DC2626', width: 1.4, dash: [7, 5],  endLabel: '+3 SD' },
    ];

    // Gender-specific primary colors (matching WHO official publications)
    function getMedianColor(gender) {
        return gender === 'female' ? '#9B1B30' : '#1B6B3A';
    }

    // ── Build LMS curve data points ──────────────────────────────────────────
    function buildCurvePoints(dataRef, xMin, xMax, sd, step) {
        const pts = [];
        for (let x = xMin; x <= xMax; x += step) {
            const lms = getLMS(dataRef, x);
            if (!lms) continue;
            const y = calculateXFromZ(sd, lms.L, lms.M, lms.S);
            if (Number.isFinite(y)) pts.push({ x, y });
        }
        return pts;
    }

    // ── End-of-curve label plugin ────────────────────────────────────────────
    // Draws labels at right edge of each SD curve, just like official WHO forms
    const END_LABEL_PLUGIN = {
        id: 'whoEndLabel',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            const area = chart.chartArea;
            chart.data.datasets.forEach((ds, i) => {
                if (!ds._endLabel) return;
                const meta = chart.getDatasetMeta(i);
                if (!meta || !meta.data || meta.data.length === 0) return;
                // Find rightmost visible point
                let lastPt = null;
                for (let j = meta.data.length - 1; j >= 0; j--) {
                    const pt = meta.data[j];
                    if (pt && pt.x <= area.right + 2) { lastPt = pt; break; }
                }
                if (!lastPt) return;
                const px = lastPt.x;
                const py = lastPt.y;
                ctx.save();
                const text = ds._endLabel;
                ctx.font = `bold 9.5px 'Plus Jakarta Sans', Arial, sans-serif`;
                const tw = ctx.measureText(text).width;
                // White pill background for readability
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(px - tw - 6, py - 8, tw + 10, 16, 3)
                              : ctx.rect(px - tw - 6, py - 8, tw + 10, 16);
                ctx.fill();
                ctx.fillStyle = ds._endLabelColor || ds.borderColor;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, px - 2, py);
                ctx.restore();
            });
        }
    };

    // ── Build Chart ──────────────────────────────────────────────────────────
    function buildChart(patient, indicator, gender) {
        const sex  = gender || patient.gender || 'male';
        const ind  = indicator || 'tbu';
        const dataRef = whoData[sex] && whoData[sex][ind];

        if (!dataRef) return { error: `Data WHO untuk indikator ${ind.toUpperCase()} tidak tersedia.` };

        const medianColor = getMedianColor(sex);
        const normalBandFill = sex === 'female' ? 'rgba(252,165,165,0.13)' : 'rgba(134,239,172,0.13)';

        // ── Indicator axis config (full official WHO ranges) ─────────────────
        const age = Number(patient.umur_dipakai);
        let xMin, xMax, xStep = 1, xLabel, yLabel, titleText, isAgeBased = true;
        let patientX, patientY;

        switch (ind) {
            case 'bbu':
                xMin = 0; xMax = 60;
                xLabel = 'Usia (bulan)'; yLabel = 'Berat Badan (kg)';
                titleText = `WHO Weight-for-Age • BB/U • ${sex === 'male' ? 'Boys' : 'Girls'} 0–5 Years`;
                patientX = age; patientY = Number(patient.bbs); break;
            case 'tbu':
                xMin = 0; xMax = 60;
                xLabel = 'Usia (bulan)'; yLabel = 'Panjang/Tinggi Badan (cm)';
                titleText = `WHO Length/Height-for-Age • TB/U • ${sex === 'male' ? 'Boys' : 'Girls'} 0–5 Years`;
                patientX = age; patientY = Number(patient.tb); break;
            case 'imtu':
                xMin = 0; xMax = 60;
                xLabel = 'Usia (bulan)'; yLabel = 'IMT / BMI (kg/m²)';
                titleText = `WHO BMI-for-Age • IMT/U • ${sex === 'male' ? 'Boys' : 'Girls'} 0–5 Years`;
                patientX = age; patientY = Number(patient.imt_value); break;
            case 'lku':
                xMin = 0; xMax = 60;
                xLabel = 'Usia (bulan)'; yLabel = 'Lingkar Kepala (cm)';
                titleText = `WHO Head Circumference-for-Age • LK/U • ${sex === 'male' ? 'Boys' : 'Girls'} 0–5 Years`;
                patientX = age; patientY = Number(patient.lk); break;
            case 'bbpb':
                isAgeBased = false;
                xMin = 45; xMax = 110; xStep = 0.5;
                xLabel = 'Panjang/Tinggi Badan (cm)'; yLabel = 'Berat Badan (kg)';
                titleText = `WHO Weight-for-Length/Height • BB/TB • ${sex === 'male' ? 'Boys' : 'Girls'}`;
                patientX = Number(patient.tb); patientY = Number(patient.bbs); break;
            default:
                return { error: `Indikator WHO "${ind}" tidak dikenal.` };
        }

        // ── Build SD curve datasets ──────────────────────────────────────────
        const datasets = SD_CONFIGS.map((cfg, idx) => {
            const color = cfg.borderColor || medianColor;
            const pts   = buildCurvePoints(dataRef, xMin, xMax, cfg.sd, xStep);

            // Shade normal band: fill from -2SD up to +2SD (4 datasets ahead)
            let fillTarget = false;
            let bgColor    = 'transparent';
            if (cfg.sd === -2) {
                fillTarget = '+4';          // dataset index +4 = +2 SD
                bgColor    = normalBandFill;
            }

            return {
                label:           cfg.endLabel,
                _endLabel:       cfg.endLabel,
                _endLabelColor:  color,
                data:            pts,
                borderColor:     color,
                backgroundColor: bgColor,
                borderWidth:     cfg.sd === 0 ? cfg.width : cfg.width,
                borderDash:      cfg.dash,
                pointRadius:     0,
                tension:         0,
                fill:            fillTarget,
                yAxisID:         'y'
            };
        });

        // ── Patient measurement dot ──────────────────────────────────────────
        const hasPatientDot = Number.isFinite(patientX) && Number.isFinite(patientY);
        if (hasPatientDot) {
            datasets.push({
                type:            'scatter',
                label:           '● Pasien',
                _endLabel:       null,
                data:            [{ x: patientX, y: patientY }],
                borderColor:     '#000000',
                backgroundColor: '#000000',
                pointStyle:      'circle',
                pointRadius:     7,
                pointHoverRadius:9,
                borderWidth:     2,
                showLine:        false,
                yAxisID:         'y'
            });
        }

        // ── HA / WA / BBI clinical dots ──────────────────────────────────────
        let hasHADot = false, hasWADot = false, hasBBIDot = false;

        if (isAgeBased && ind === 'tbu' && Number.isFinite(patient.haMonth) && Number.isFinite(patientY)) {
            // HA dot on TB/U: x = Height Age, y = patient TB
            if (patient.haMonth >= xMin && patient.haMonth <= xMax) {
                datasets.push({
                    type: 'scatter', label: '🔵 HA (Height Age)',
                    _endLabel: null,
                    data: [{ x: patient.haMonth, y: patientY }],
                    borderColor: '#2563EB', backgroundColor: '#2563EB',
                    pointStyle: 'triangle', pointRadius: 7, pointHoverRadius: 9,
                    borderWidth: 2, showLine: false, yAxisID: 'y'
                });
                hasHADot = true;
            }
        }

        if (isAgeBased && ind === 'bbu') {
            // WA dot on BB/U: x = Weight Age, y = patient BB
            if (Number.isFinite(patient.waMonth) && Number.isFinite(patientY)) {
                if (patient.waMonth >= xMin && patient.waMonth <= xMax) {
                    datasets.push({
                        type: 'scatter', label: '🔵 WA (Weight Age)',
                        _endLabel: null,
                        data: [{ x: patient.waMonth, y: patientY }],
                        borderColor: '#2563EB', backgroundColor: '#2563EB',
                        pointStyle: 'triangle', pointRadius: 7, pointHoverRadius: 9,
                        borderWidth: 2, showLine: false, yAxisID: 'y'
                    });
                    hasWADot = true;
                }
            }
            // BBI dot on BB/U: x = HA (or age), y = BBI
            if (Number.isFinite(patient.bbi)) {
                const bbiX = Number.isFinite(patient.haMonth) ? patient.haMonth : age;
                if (bbiX >= xMin && bbiX <= xMax) {
                    datasets.push({
                        type: 'scatter', label: '🟢 BBI (Ideal Weight)',
                        _endLabel: null,
                        data: [{ x: bbiX, y: patient.bbi }],
                        borderColor: '#16A34A', backgroundColor: '#16A34A',
                        pointStyle: 'rectRot', pointRadius: 7, pointHoverRadius: 9,
                        borderWidth: 2, showLine: false, yAxisID: 'y'
                    });
                    hasBBIDot = true;
                }
            }
        }

        // ── Axis definitions ─────────────────────────────────────────────────
        const xAxis = isAgeBased
            ? window.GrowthChartShared.createYearAxis(xMin, xMax, xLabel, { microStep: 1, yearAccent: true })
            : {
                type: 'linear', min: xMin, max: xMax,
                title: { display: true, text: xLabel, font: { weight: 'bold' } },
                ticks: { stepSize: 5 },
                grid:  { color: '#e5e7eb', lineWidth: 0.8 }
              };

        const yAxis = window.GrowthChartShared.createNumericAxis(yLabel, 'left', { maxTicksLimit: 14 });

        // Legend HTML
        const legendHtml = buildLegend(sex, hasHADot, hasWADot, hasBBIDot);

        return {
            title:    titleText,
            datasets,
            scales:   { x: xAxis, y: yAxis },
            plugins:  [END_LABEL_PLUGIN],
            legendHtml,
            note:     `Referensi WHO Child Growth Standards. Warna merah = ±3 SD, oranye = ±2 SD, kuning = ±1 SD. Area hijau/merah muda = zona normal (-2 s.d. +2 SD).`,
            sourceUrl: 'https://www.who.int/tools/child-growth-standards/standards',
            referenceLabel: 'WHO Child Growth Standards (0–5 tahun)',
            tooltipLabel(context) {
                if (context.dataset.type === 'scatter') {
                    const lbl = context.dataset.label || '';
                    if (lbl.includes('HA')) return `HA: usia ${Number(context.parsed.x).toFixed(1)} bln (TB ${Number(context.parsed.y).toFixed(1)} cm)`;
                    if (lbl.includes('WA')) return `WA: usia ${Number(context.parsed.x).toFixed(1)} bln (BB ${Number(context.parsed.y).toFixed(1)} kg)`;
                    if (lbl.includes('BBI')) return `BBI: ${Number(context.parsed.y).toFixed(2)} kg pada usia HA ${Number(context.parsed.x).toFixed(1)} bln`;
                    return `Pasien: x=${Number(context.parsed.x).toFixed(1)} bln, y=${Number(context.parsed.y).toFixed(2)}`;
                }
                return `${context.dataset.label}: ${Number(context.parsed.y).toFixed(2)}`;
            }
        };
    }

    function buildLegend(gender, hasHA, hasWA, hasBBI) {
        const medColor = getMedianColor(gender);
        const items = [
            { color: '#DC2626', label: '±3 SD', dashed: true },
            { color: '#EA580C', label: '±2 SD', dashed: true },
            { color: '#CA8A04', label: '±1 SD', dashed: true },
            { color: medColor,  label: 'Median (0 SD)', dashed: false },
            { color: '#000',    label: 'Pasien ●', dot: true },
        ];
        if (hasHA) items.push({ color: '#2563EB', label: 'HA (Height Age) ▲', dot: true });
        if (hasWA) items.push({ color: '#2563EB', label: 'WA (Weight Age) ▲', dot: true });
        if (hasBBI) items.push({ color: '#16A34A', label: 'BBI (Ideal Weight) ◆', dot: true });
        return `<div class="legend-group">` + items.map(it => {
            if (it.dot) return `<div class="legend-item"><div class="legend-point" style="background:${it.color};"></div>${it.label}</div>`;
            return `<div class="legend-item"><div class="legend-color ${it.dashed ? 'dashed' : ''}" style="background:${it.color};color:${it.color};"></div>${it.label}</div>`;
        }).join('') + `</div>`;
    }

    window.WHOChartModule = {
        options: [
            { value: 'tbu',  label: 'TB/U: Length/Height-for-Age' },
            { value: 'bbu',  label: 'BB/U: Weight-for-Age' },
            { value: 'imtu', label: 'IMT/U: BMI-for-Age' },
            { value: 'bbpb', label: 'BB/TB: Weight-for-Length/Height' },
            { value: 'lku',  label: 'LK/U: Head Circumference' }
        ],
        defaultIndicator: 'tbu',
        buildChart
    };
})();
