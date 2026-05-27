// ============================================================================
// CDC CHART MODULE — Official Medical Form Appearance
// Matching CDC 2000 Clinical Growth Charts visual style:
//   Boys: dark blue/navy palette | Girls: dark red/maroon palette
//   Full official age ranges | Percentile curves labeled at right end
//   Key clinical cutoff lines (P5, P85, P95 for BMI highlighted)
// ============================================================================
(function () {

    // ── Official CDC Percentile sets ─────────────────────────────────────────
    // Full set matching official CDC Clinical Growth Charts
    const PCTS_FULL   = [3, 5, 10, 25, 50, 75, 90, 95, 97];
    const PCTS_BMI    = [5, 10, 25, 50, 75, 85, 90, 95, 97];

    // Color per percentile — both boys (blue) and girls (red) share same pattern:
    // outer lines lighter, median darkest & thickest, clinical cutoffs accented
    function getCurveColor(pct, gender, isBmi) {
        const isFemale = gender === 'female';
        // Clinical-significance accent colors
        if (isBmi) {
            if (pct === 5)  return isFemale ? '#B91C1C' : '#1D4ED8';   // Underweight cutoff
            if (pct === 85) return isFemale ? '#D97706' : '#D97706';   // Overweight cutoff (orange both)
            if (pct === 95) return isFemale ? '#DC2626' : '#DC2626';   // Obesity cutoff (red both)
        }
        // Base palette: median darkest, extremes lighter
        const palette = isFemale
            ? { 3:'#FECACA', 5:'#FCA5A5', 10:'#F87171', 25:'#EF4444', 50:'#991B1B', 75:'#EF4444', 85:'#D97706', 90:'#F87171', 95:'#DC2626', 97:'#FECACA' }
            : { 3:'#BFDBFE', 5:'#93C5FD', 10:'#60A5FA', 25:'#3B82F6', 50:'#1E3A8A', 75:'#3B82F6', 85:'#D97706', 90:'#60A5FA', 95:'#DC2626', 97:'#BFDBFE' };
        return palette[pct] || (isFemale ? '#991B1B' : '#1E3A8A');
    }

    // ── End-of-curve label plugin ────────────────────────────────────────────
    const END_LABEL_PLUGIN = {
        id: 'cdcEndLabel',
        afterDatasetsDraw(chart) {
            const ctx  = chart.ctx;
            const area = chart.chartArea;
            chart.data.datasets.forEach((ds, i) => {
                if (!ds._endLabel) return;
                const meta = chart.getDatasetMeta(i);
                if (!meta || !meta.data || meta.data.length === 0) return;
                let lastPt = null;
                for (let j = meta.data.length - 1; j >= 0; j--) {
                    const pt = meta.data[j];
                    if (pt && pt.x <= area.right + 2) { lastPt = pt; break; }
                }
                if (!lastPt) return;
                const { x, y } = lastPt;
                ctx.save();
                ctx.font = `bold 9.5px 'Plus Jakarta Sans', Arial, sans-serif`;
                const text = ds._endLabel;
                const tw   = ctx.measureText(text).width;
                // White pill bg
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x - tw - 6, y - 8, tw + 10, 16, 3);
                else ctx.rect(x - tw - 6, y - 8, tw + 10, 16);
                ctx.fill();
                ctx.fillStyle = ds._endLabelColor || ds.borderColor;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x - 2, y);
                ctx.restore();
            });
        }
    };

    // ── Build one percentile curve dataset ───────────────────────────────────
    function buildPctDataset(dataArr, xMin, xMax, pct, gender, isBmi) {
        const z   = percentileToZ(pct);
        const pts = [];
        for (let age = xMin; age <= xMax; age += 1) {
            const lms = getLMS_CDC(dataArr, age);
            if (!lms) continue;
            const y = calculateXFromZ(z, lms.L, lms.M, lms.S);
            if (Number.isFinite(y)) pts.push({ x: age, y });
        }
        const color     = getCurveColor(pct, gender, isBmi);
        const isMedian  = pct === 50;
        // BMI clinical cutoffs get thicker lines
        const isClinCut = isBmi && (pct === 5 || pct === 85 || pct === 95);
        const label     = `P${pct}`;

        return {
            label:           label,
            _endLabel:       label,
            _endLabelColor:  color,
            data:            pts,
            borderColor:     color,
            backgroundColor: 'transparent',
            borderWidth:     isMedian ? 2.8 : isClinCut ? 2.0 : 1.3,
            borderDash:      isMedian ? [] : isClinCut ? [4, 3] : [6, 4],
            pointRadius:     0,
            tension:         0,
            fill:            false,
            yAxisID:         'y'
        };
    }

    // ── Main buildChart ──────────────────────────────────────────────────────
    function buildChart(patient, indicator, gender) {
        const sex = gender || patient.gender || 'male';
        const ind = indicator || 'stature';
        const ref = cdcData[sex] && cdcData[sex][ind];

        if (!ref) return { error: `Data CDC untuk indikator ${ind.toUpperCase()} tidak tersedia.` };

        const age  = Number(patient.umur_dipakai);
        const isBmi = (ind === 'bmi');
        const pcts  = isBmi ? PCTS_BMI : PCTS_FULL;

        // ── Indicator + official full-range axis config ───────────────────────
        // CDC clinical charts: 2–20 years = 24–240 months
        let xMin = 24, xMax = 240, xLabel, yLabel, titleText;
        let patientX = age, patientY;

        switch (ind) {
            case 'stature':
                xLabel  = 'Usia (bulan)'; yLabel = 'Tinggi Badan (cm)';
                titleText = `CDC Stature-for-Age • TB/U • ${sex === 'male' ? 'Boys' : 'Girls'} 2–20 Years`;
                patientY = Number(patient.tb); break;
            case 'weight':
                xLabel  = 'Usia (bulan)'; yLabel = 'Berat Badan (kg)';
                titleText = `CDC Weight-for-Age • BB/U • ${sex === 'male' ? 'Boys' : 'Girls'} 2–20 Years`;
                patientY = Number(patient.bbs); break;
            case 'bmi':
                xLabel  = 'Usia (bulan)'; yLabel = 'BMI / IMT (kg/m²)';
                titleText = `CDC BMI-for-Age • IMT/U • ${sex === 'male' ? 'Boys' : 'Girls'} 2–20 Years`;
                patientY = Number(patient.imt_value); break;
            default:
                return { error: `Indikator CDC "${ind}" tidak dikenal.` };
        }

        // ── Build datasets ───────────────────────────────────────────────────
        const datasets = pcts.map(pct => buildPctDataset(ref, xMin, xMax, pct, sex, isBmi));

        // Patient dot
        const hasPatientDot = Number.isFinite(patientX) && Number.isFinite(patientY)
                            && patientX >= xMin && patientX <= xMax;
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

        if (ind === 'stature' && Number.isFinite(patient.haMonth) && Number.isFinite(patientY)) {
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

        if (ind === 'weight') {
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

        // ── Axes ─────────────────────────────────────────────────────────────
        const xAxis = window.GrowthChartShared.createYearAxis(xMin, xMax, xLabel, { microStep: 6, yearAccent: true });
        const yAxis = window.GrowthChartShared.createNumericAxis(yLabel, 'left', { maxTicksLimit: 14 });

        const legendHtml = buildLegend(sex, pcts, isBmi, hasHADot, hasWADot, hasBBIDot);

        return {
            title:    titleText,
            datasets,
            scales:   { x: xAxis, y: yAxis },
            plugins:  [END_LABEL_PLUGIN],
            legendHtml,
            note: isBmi
                ? 'CDC BMI-for-Age: P85 = batas overweight, P95 = batas obesitas (ditandai oranye/merah). Garis tengah = P50 (Median).'
                : 'CDC Growth Charts 2000. P50 = median, kurva terluar = P3 dan P97. Titik hitam = pengukuran pasien.',
            sourceUrl: 'https://www.cdc.gov/growthcharts/cdc-charts.htm',
            referenceLabel: 'CDC Clinical Growth Charts (2–20 tahun)',
            tooltipLabel(context) {
                if (context.dataset.type === 'scatter') {
                    const lbl = context.dataset.label || '';
                    if (lbl.includes('HA')) return `HA: usia ${Number(context.parsed.x).toFixed(1)} bln (TB ${Number(context.parsed.y).toFixed(1)} cm)`;
                    if (lbl.includes('WA')) return `WA: usia ${Number(context.parsed.x).toFixed(1)} bln (BB ${Number(context.parsed.y).toFixed(1)} kg)`;
                    if (lbl.includes('BBI')) return `BBI: ${Number(context.parsed.y).toFixed(2)} kg pada usia HA ${Number(context.parsed.x).toFixed(1)} bln`;
                    return `Pasien: usia ${Number(context.parsed.x).toFixed(1)} bln, y=${Number(context.parsed.y).toFixed(2)}`;
                }
                return `${context.dataset.label}: ${Number(context.parsed.y).toFixed(2)}`;
            }
        };
    }

    function buildLegend(gender, pcts, isBmi, hasHA, hasWA, hasBBI) {
        const items = [
            ...pcts.map(p => ({
                color: getCurveColor(p, gender, isBmi),
                label: isBmi && p === 85 ? 'P85 (Overweight ↑)'
                     : isBmi && p === 95 ? 'P95 (Obese ↑)'
                     : isBmi && p === 5  ? 'P5 (Underweight ↓)'
                     : `P${p}${p === 50 ? ' (Median)' : ''}`,
                dashed: p !== 50
            })),
            { color: '#000', label: 'Pasien ●', dot: true }
        ];
        if (hasHA) items.push({ color: '#2563EB', label: 'HA (Height Age) ▲', dot: true });
        if (hasWA) items.push({ color: '#2563EB', label: 'WA (Weight Age) ▲', dot: true });
        if (hasBBI) items.push({ color: '#16A34A', label: 'BBI (Ideal Weight) ◆', dot: true });
        return `<div class="legend-group">` + items.map(it => {
            if (it.dot) return `<div class="legend-item"><div class="legend-point" style="background:${it.color};"></div>${it.label}</div>`;
            return `<div class="legend-item"><div class="legend-color ${it.dashed ? 'dashed' : ''}" style="background:${it.color};color:${it.color};"></div>${it.label}</div>`;
        }).join('') + `</div>`;
    }

    window.CDCChartModule = {
        options: [
            { value: 'stature', label: 'TB/U: Stature-for-Age' },
            { value: 'weight',  label: 'BB/U: Weight-for-Age' },
            { value: 'bmi',     label: 'IMT/U: BMI-for-Age' }
        ],
        defaultIndicator: 'stature',
        buildChart
    };
})();
