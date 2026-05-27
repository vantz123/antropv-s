window.chartInstance = null;
window.chartInstancesList = [];

(function () {
    function destroyCurrentChart() {
        if (window.chartInstance && typeof window.chartInstance.destroy === 'function') {
            window.chartInstance.destroy();
        }
        window.chartInstance = null;
    }

    function destroyAllCharts() {
        if (window.chartInstancesList && window.chartInstancesList.length > 0) {
            window.chartInstancesList.forEach(inst => {
                if (inst && typeof inst.destroy === 'function') {
                    inst.destroy();
                }
            });
        }
        window.chartInstancesList = [];
        destroyCurrentChart();
    }

    function formatYearsFromMonths(months) {
        const years = Number(months) / 12;
        return Number.isInteger(years) ? String(years) : years.toFixed(2).replace(/\.00$/, '');
    }

    // Sumbu X usia dengan grid bantu MICRO
    function createYearAxis(minMonth, maxMonth, label, options = {}) {
        const microStep = options.microStep || 2;       // step grid bantu (bulan)
        const yearAccent = options.yearAccent !== false; // highlight per tahun
        return {
            type: 'linear',
            min: minMonth,
            max: maxMonth,
            title: {
                display: true,
                text: label,
                font: { weight: 'bold' }
            },
            ticks: {
                stepSize: microStep,
                autoSkip: false,
                callback(value) {
                    const v = Number(value);
                    if (v % 12 === 0) return formatYearsFromMonths(v);
                    return '';
                },
                font(ctx) {
                    const v = Number(ctx.tick && ctx.tick.value);
                    return v % 12 === 0 ? { weight: 'bold' } : { size: 9 };
                }
            },
            grid: {
                color(context) {
                    const value = Number(context.tick && context.tick.value);
                    if (value % 12 === 0) return yearAccent ? '#90a4ae' : '#b0bec5';
                    if (value % 6 === 0) return '#cfd8dc';
                    return '#eceff1';
                },
                lineWidth(context) {
                    const value = Number(context.tick && context.tick.value);
                    if (value % 12 === 0) return 1.6;
                    if (value % 6 === 0) return 1.0;
                    return 0.6;
                }
            }
        };
    }

    // Sumbu Y dengan grid bantu padat agar pembacaan WA/HA visual lebih akurat.
    function createNumericAxis(label, position = 'left', options = {}) {
        const denseGrid = options.denseGrid !== false;
        return {
            type: 'linear',
            position,
            beginAtZero: false,
            title: {
                display: true,
                text: label,
                font: { weight: 'bold' }
            },
            ticks: {
                maxTicksLimit: options.maxTicksLimit || 24,
                autoSkip: false
            },
            grid: {
                color: position === 'right' ? 'rgba(0,0,0,0.05)' : (denseGrid ? '#eceff1' : '#f5f5f5'),
                lineWidth: 0.7,
                drawOnChartArea: position !== 'right'
            }
        };
    }

    function getRefModule(ref) {
        return ref === 'who' ? window.WHOChartModule : window.CDCChartModule;
    }

    function getActiveGender(patient) {
        const selected = document.getElementById('gender_grafik').value;
        return selected || patient.gender || 'male';
    }

    function getRefActive(ageInMonths) {
        const refSelection = document.getElementById('ref_grafik').value;
        if (refSelection === 'who') return 'who';
        if (refSelection === 'cdc') return 'cdc';
        return ageInMonths > 60 ? 'cdc' : 'who';
    }

    function applyGraphGenderSelection() {
        const graphGender = document.getElementById('gender_grafik');
        const patientGender = document.getElementById('gender');
        const selected = graphGender ? graphGender.value : '';
        if (patientGender && selected && patientGender.value !== selected) patientGender.value = selected;
        const bbiGender = document.getElementById('bbi_gender');
        if (bbiGender && selected) bbiGender.value = selected;
        const tpgGender = document.getElementById('tpg_gender');
        if (tpgGender && selected) tpgGender.value = selected;
        const hasCoreFields = ['umur_bulan','bbs','tb'].every((id) => {
            const el = document.getElementById(id);
            return el && String(el.value).trim() !== '';
        });
        if (selected && hasCoreFields && typeof window.hitungSemua === 'function') {
            window.hitungSemua();
            if (typeof tampilkanGrafik === 'function') tampilkanGrafik();
        } else if (typeof tampilkanGrafik === 'function') {
            tampilkanGrafik();
        }
    }

    function syncGraphGenderSelector(value) {
        const graphGender = document.getElementById('gender_grafik');
        if (graphGender && value && graphGender.value !== value) graphGender.value = value;
    }

    function fillIndicatorSelect(module, preferredValue) {
        const select = document.getElementById('indikator_grafik');
        select.innerHTML = module.options
            .map((option) => `<option value="${option.value}">${option.label}</option>`)
            .join('');
        const available = module.options.map((option) => option.value);
        select.value = available.includes(preferredValue) ? preferredValue : module.defaultIndicator;
    }

    function updateIndikatorGrafik() {
        const patient = window.hasilSementara;
        if (patient && patient.gender) syncGraphGenderSelector(patient.gender);
        const ageInMonths = patient && Number.isFinite(patient.umur_dipakai) ? Number(patient.umur_dipakai) : 0;
        const activeRef = getRefActive(ageInMonths);
        const module = getRefModule(activeRef);
        
        // Sync ref dropdown if auto is selected
        const refSelect = document.getElementById('ref_grafik');
        if (refSelect && refSelect.value === 'auto') {
            // Keep it auto, but module loads based on age
        }

        fillIndicatorSelect(module, document.getElementById('indikator_grafik').value);
        if (patient) {
            tampilkanGrafik();
        }
    }

    function buildInfoHtml(ref, gender, patient, note, sourceUrl, sourceLabel, geometryHtml) {
        const genderLabel = gender === 'male' ? 'Laki-laki' : 'Perempuan';
        const refLabel = ref === 'who' ? 'WHO' : 'CDC';
        const prematurText = patient.isPrematur
            ? ` | 🍼 Usia koreksi: ${Number(patient.umur_dipakai).toFixed(1)} bln`
            : '';
        const noteHtml = note ? `<div class="chart-note">${note}</div>` : '';
        const geomHtml = geometryHtml ? `<div class="chart-geometry">${geometryHtml}</div>` : '';
        const sourceHtml = sourceUrl
            ? `<div class="chart-source-links"><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceLabel || 'Sumber resmi'}</a></div>`
            : '';
        return `Menggunakan <span class="ref-toggle ${ref}">${refLabel}</span> untuk <strong>${genderLabel}</strong>${prematurText}${noteHtml}${geomHtml}${sourceHtml}`;
    }

    function getChartOptions(chartResult) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            parsing: false,
            normalized: true,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            if (typeof chartResult.tooltipLabel === 'function') {
                                return chartResult.tooltipLabel(context);
                            }
                            return `${context.dataset.label}: (${Number(context.parsed.x).toFixed(2)}, ${Number(context.parsed.y).toFixed(2)})`;
                        }
                    }
                }
            },
            scales: chartResult.scales
        };
    }

    function tampilkanGrafik() {
        const infoEl = document.getElementById('info-grafik');
        const legendEl = document.getElementById('legend-grafik');
        const singleView = document.getElementById('single-chart-view');
        const allView = document.getElementById('all-charts-view');
        const isAllMode = document.getElementById('tampilan_grafik').value === 'all';

        if (typeof Chart === 'undefined') {
            infoEl.innerHTML = '<span style="color:#dc3545;">⚠️ Chart.js belum ter-load.</span>';
            return;
        }
        if (!singleView || !allView) {
            infoEl.innerHTML = '<span style="color:#dc3545;">⚠️ Layout grafik tidak ditemukan.</span>';
            return;
        }

        if (!window.hasilSementara) {
            destroyAllCharts();
            legendEl.innerHTML = '';
            infoEl.innerHTML = '<span style="color:#dc3545;">⚠️ Hitung data pasien dulu di tab Antropometri.</span>';
            return;
        }

        const patient = window.hasilSementara;
        const hasGraphData = [patient.bbs, patient.tb, patient.imt_value, patient.lk].some((value) => Number.isFinite(value));
        if (!hasGraphData) {
            destroyAllCharts();
            legendEl.innerHTML = '';
            infoEl.innerHTML = '<span style="color:#dc3545;">⚠️ Tidak ada data pengukuran yang dapat digrafikkan.</span>';
            return;
        }

        const gender = getActiveGender(patient);
        if (!gender) {
            infoEl.innerHTML = '<span style="color:#dc3545;">⚠️ Gender belum ditentukan.</span>';
            return;
        }

        const activeRef = getRefActive(Number(patient.umur_dipakai));
        const module = getRefModule(activeRef);

        destroyAllCharts();

        // ─── Update header identitas pasien untuk hasil cetak ───────────────────
        (function updatePrintPatientHeader() {
            const metaEl = document.getElementById('pph-meta-text');
            const dateEl = document.getElementById('pph-print-date');
            if (!metaEl || !dateEl) return;

            const nama = patient.nama || 'Anonim';
            const genderLabel = patient.gender === 'female' ? 'Perempuan' : (patient.gender === 'male' ? 'Laki-laki' : '');
            const umurBulan = Number.isFinite(patient.umur_bulan) ? patient.umur_bulan : patient.umur_dipakai;
            let umurStr = '';
            if (Number.isFinite(umurBulan)) {
                const th = Math.floor(umurBulan / 12);
                const bln = Math.round(umurBulan % 12);
                if (th > 0 && bln > 0) umurStr = `${th} thn ${bln} bln`;
                else if (th > 0) umurStr = `${th} tahun`;
                else umurStr = `${Math.round(umurBulan)} bulan`;
            }
            const tglUkur = patient.tanggal_ukur ? new Date(patient.tanggal_ukur).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
            const refLabel = activeRef === 'who' ? 'WHO' : 'CDC';

            // Bangun baris meta
            const parts = [];
            parts.push(`<strong>Nama:</strong> ${nama}`);
            if (genderLabel) parts.push(`<strong>JK:</strong> ${genderLabel}`);
            if (umurStr) parts.push(`<strong>Usia:</strong> ${umurStr}`);
            if (patient.isPrematur && Number.isFinite(patient.umur_dipakai)) {
                parts.push(`<strong>Usia Koreksi:</strong> ${Number(patient.umur_dipakai).toFixed(1)} bln`);
            }
            if (Number.isFinite(patient.bbs)) parts.push(`<strong>BB:</strong> ${patient.bbs} kg`);
            if (Number.isFinite(patient.tb)) parts.push(`<strong>TB:</strong> ${patient.tb} cm`);
            if (tglUkur) parts.push(`<strong>Tgl Ukur:</strong> ${tglUkur}`);
            parts.push(`<strong>Referensi:</strong> ${refLabel}`);

            metaEl.innerHTML = parts.join(' &nbsp;|&nbsp; ');

            // Tanggal cetak (hari ini)
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        })();
        // ────────────────────────────────────────────────────────────────────────


        if (!isAllMode) {
            // Render single chart on canvas
            const canvas = document.getElementById('growthChart');
            if (!canvas) return;

            const indicatorSelect = document.getElementById('indikator_grafik');
            const allowedIndicators = module.options.map((option) => option.value);
            if (!allowedIndicators.includes(indicatorSelect.value)) {
                fillIndicatorSelect(module, module.defaultIndicator);
            }
            const indicator = indicatorSelect.value;
            const chartResult = module.buildChart(patient, indicator, gender);

            if (!chartResult || chartResult.error) {
                legendEl.innerHTML = '';
                infoEl.innerHTML = `<span style="color:#dc3545;">⚠️ ${chartResult && chartResult.error ? chartResult.error : 'Grafik gagal dibuat.'}</span>`;
                return;
            }

            legendEl.innerHTML = chartResult.legendHtml || '';
            infoEl.innerHTML = buildInfoHtml(activeRef, gender, patient, chartResult.note, chartResult.sourceUrl, chartResult.referenceLabel, chartResult.geometryHtml);

            const ctx = canvas.getContext('2d');
            window.chartInstance = new Chart(ctx, {
                type: 'line',
                data: { datasets: chartResult.datasets },
                plugins: Array.isArray(chartResult.plugins) ? chartResult.plugins : [],
                options: getChartOptions(chartResult)
            });

            setTimeout(() => {
                if (window.chartInstance && typeof window.chartInstance.resize === 'function') {
                    window.chartInstance.resize();
                    window.chartInstance.update('none');
                }
            }, 60);
        } else {
            // Render all relevant charts in a grid
            allView.innerHTML = '';
            legendEl.innerHTML = ''; // Hide single legend
            infoEl.innerHTML = `Menampilkan semua grafik pertumbuhan ${activeRef.toUpperCase()} untuk <strong>${gender === 'male' ? 'Laki-laki' : 'Perempuan'}</strong> (${Number(patient.umur_dipakai).toFixed(1)} bln).`;

            // Filter relevant indicators
            const indicatorsToRender = module.options.filter(opt => {
                if (opt.value === 'lku' && !Number.isFinite(patient.lk)) return false;
                if (opt.value === 'bbpb' && (!Number.isFinite(patient.tb) || !Number.isFinite(patient.bbs))) return false;
                if (opt.value === 'imtu' && !Number.isFinite(patient.imt_value)) return false;
                if (opt.value === 'bmi' && !Number.isFinite(patient.imt_value)) return false;
                return true;
            });

            indicatorsToRender.forEach((opt) => {
                const chartResult = module.buildChart(patient, opt.value, gender);
                if (!chartResult || chartResult.error) return;

                // Create wrapper and canvas elements
                const card = document.createElement('div');
                card.className = 'result-card chart-card';
                card.style.padding = '15px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.borderLeft = '4px solid var(--primary-color)';

                const title = document.createElement('h3');
                title.style.margin = '0 0 10px 0';
                title.style.fontSize = '0.95em';
                title.style.fontWeight = '800';
                title.innerText = chartResult.title;

                const wrapper = document.createElement('div');
                wrapper.className = 'chart-container';
                wrapper.style.position = 'relative';
                wrapper.style.height = '320px';
                wrapper.style.width = '100%';

                const canvas = document.createElement('canvas');
                canvas.id = `chart-all-${opt.value}`;
                wrapper.appendChild(canvas);

                const legendWrap = document.createElement('div');
                legendWrap.style.marginTop = '10px';
                legendWrap.innerHTML = chartResult.legendHtml || '';

                const btnWrap = document.createElement('div');
                btnWrap.style.marginTop = '10px';
                btnWrap.style.textAlign = 'right';
                const dwnBtn = document.createElement('button');
                dwnBtn.className = 'btn btn-secondary';
                dwnBtn.style.padding = '6px 12px';
                dwnBtn.style.fontSize = '0.8em';
                dwnBtn.innerHTML = '⬇️ Unduh Gambar';
                dwnBtn.onclick = () => {
                    const patientSafeName = (patient.nama || 'Anonim').replace(/[^a-z0-9]/gi, '_');
                    const refStr = activeRef.toUpperCase();
                    const ageStr = activeRef === 'who' ? '0-5_Tahun' : '2-20_Tahun';
                    const genStr = gender === 'male' ? 'Laki-laki' : 'Perempuan';
                    downloadCanvasAsImage(canvas, `Grafik_NonPDF_${refStr}_${ageStr}_${opt.value.toUpperCase()}_${genStr}_${patientSafeName}.png`);
                };
                btnWrap.appendChild(dwnBtn);

                card.appendChild(title);
                card.appendChild(wrapper);
                card.appendChild(legendWrap);
                card.appendChild(btnWrap);
                allView.appendChild(card);

                const ctx = canvas.getContext('2d');
                const newChart = new Chart(ctx, {
                    type: 'line',
                    data: { datasets: chartResult.datasets },
                    plugins: Array.isArray(chartResult.plugins) ? chartResult.plugins : [],
                    options: getChartOptions(chartResult)
                });
                window.chartInstancesList.push(newChart);
            });
        }
    }

    function onTampilanGrafikChange() {
        const value = document.getElementById('tampilan_grafik').value;
        const singleView = document.getElementById('single-chart-view');
        const allView = document.getElementById('all-charts-view');
        const activeDL = document.getElementById('btn-download-active');
        const allDL = document.getElementById('btn-download-all');
        const indicatorSelect = document.getElementById('indikator_grafik');
        const indicatorGroup = indicatorSelect ? indicatorSelect.parentNode : null;

        if (value === 'all') {
            if (singleView) singleView.style.display = 'none';
            if (allView) allView.style.display = 'grid';
            if (activeDL) activeDL.style.display = 'none';
            if (allDL) allDL.style.display = 'inline-flex';
            if (indicatorGroup) indicatorGroup.style.display = 'none';
        } else {
            if (singleView) singleView.style.display = 'block';
            if (allView) allView.style.display = 'none';
            if (activeDL) activeDL.style.display = 'inline-flex';
            if (allDL) allDL.style.display = 'none';
            if (indicatorGroup) indicatorGroup.style.display = 'flex';
        }
        tampilkanGrafik();
    }

    function downloadCanvasAsImage(canvas, filename) {
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = filename;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill white background so image isn't transparent
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw original canvas content
        tempCtx.drawImage(canvas, 0, 0);
        
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function downloadActiveChart() {
        const indicator = document.getElementById('indikator_grafik').value;
        if (!indicator) return;
        
        const btn = document.getElementById('btn-download-active');
        const oldText = btn.innerHTML;
        if (btn) {
            btn.innerHTML = '⏳ Memproses PDF...';
            btn.disabled = true;
        }
        
        try {
            await downloadChartBackground(indicator);
        } finally {
            if (btn) {
                btn.innerHTML = oldText;
                btn.disabled = false;
            }
        }
    }

    async function downloadAllCharts() {
        const canvases = document.querySelectorAll('#all-charts-view canvas');
        if (canvases.length === 0) return;
        
        const btn = document.getElementById('btn-download-all');
        const oldText = btn.innerHTML;
        if (btn) {
            btn.innerHTML = '⏳ Memproses PDF...';
            btn.disabled = true;
        }
        
        try {
            for (let canvas of canvases) {
                const idParts = canvas.id.split('-');
                const ind = idParts[idParts.length - 1];
                if (ind) {
                    await downloadChartBackground(ind);
                }
            }
        } finally {
            if (btn) {
                btn.innerHTML = oldText;
                btn.disabled = false;
            }
        }
    }

    async function downloadChartBackground(indicator) {
        const patient = window.hasilSementara;
        if (!patient) {
            alert("Mohon hitung data pasien terlebih dahulu.");
            return;
        }
        
        const age = Number(patient.umur_dipakai);
        let activeRef = getRefActive(age); // 'who' or 'cdc'
        const gender = getActiveGender(patient);
        
        // Mapping indicator dari AntroBuild ke nama kunci di OfficialChartsDB
        let normalizedInd = indicator;
        if (indicator === 'stature' || indicator === 'weight' || indicator === 'bmi') {
            activeRef = 'cdc';
            normalizedInd = indicator;
        } else if (indicator === 'tbu') {
            activeRef = 'who'; normalizedInd = 'stature';
        } else if (indicator === 'bbu') {
            activeRef = 'who'; normalizedInd = 'weight';
        } else if (indicator === 'imtu') {
            activeRef = 'who'; normalizedInd = 'imtu';
        } else if (indicator === 'lku') {
            activeRef = 'who'; normalizedInd = 'headcirc';
        } else if (indicator === 'bbpb' || indicator === 'bbtb') {
            activeRef = 'who'; normalizedInd = 'weight_length';
        }

        const chartKey = `${activeRef}_${gender}_${normalizedInd}`;

        // Jika data kalibrasi PDF resmi tersedia
        if (window.OfficialChartsDB && window.OfficialChartsDB[chartKey]) {
            await downloadOfficialChartPDF(chartKey, patient, activeRef, indicator);
        } else {
            // Fallback: Gunakan Chart.js seperti semula jika PDF belum dikalibrasi
            console.log(`Kalibrasi PDF untuk ${chartKey} belum tersedia, menggunakan fallback Chart.js`);
            downloadChartFallback(patient, indicator, activeRef, gender);
        }
    }

    async function downloadOfficialChartPDF(chartKey, patient, activeRef, indicator) {
        const chartConfig = window.OfficialChartsDB[chartKey];
        if (!window.pdfjsLib) {
            alert("Error: Library PDF.js tidak dimuat.");
            return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        try {
            // 1. Load PDF
            const loadingTask = window.pdfjsLib.getDocument(chartConfig.pdfUrl);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            // 2. Render to Canvas (Scale 2.0 for High-Res)
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;

            // 3. Tentukan nilai X dan Y yang sesuai dengan indikator
            let xAxisValue = patient.umur_dipakai; // Default X is Age in months
            let yAxisValue = null;
            let xAxisText = `${window.GrowthChartShared.formatYearsFromMonths(patient.umur_dipakai)}th`;
            let yAxisText = '';

            if (indicator === 'bmi' || indicator === 'imtu') {
                yAxisValue = patient.imt_value;
                yAxisText = Number(yAxisValue).toFixed(1);
                chartKey = `${activeRef}_${patient.gender}_bmi`;
            } else if (indicator === 'stature' || indicator === 'tbu') {
                yAxisValue = patient.tb;
                yAxisText = `${Number(yAxisValue).toFixed(1)} cm`;
                chartKey = `${activeRef}_${patient.gender}_stature`;
            } else if (indicator === 'weight' || indicator === 'bbu') {
                yAxisValue = patient.bbs;
                yAxisText = `${Number(yAxisValue).toFixed(1)} kg`;
                chartKey = `${activeRef}_${patient.gender}_weight`;
            } else if (indicator === 'headcirc' || indicator === 'lku') {
                yAxisValue = patient.lk;
                yAxisText = `${Number(yAxisValue).toFixed(1)} cm`;
                chartKey = `${activeRef}_${patient.gender}_headcirc`;
            } else if (indicator === 'weight_length' || indicator === 'bbpb' || indicator === 'bbtb') {
                xAxisValue = patient.tb; // X axis is Length/Stature!
                xAxisText = `${Number(xAxisValue).toFixed(1)} cm`;
                yAxisValue = patient.bbs;
                yAxisText = `${Number(yAxisValue).toFixed(1)} kg`;
                chartKey = `${activeRef}_${patient.gender}_weight_length`;
            }

            // Fallback key update if original chartKey didn't match standard
            const activeChartConfig = window.OfficialChartsDB[chartKey] || chartConfig;

            // Helper: format age in Indonesian text
            const formatAgeIndonesian = (months) => {
                const totalMonths = Math.round(Number(months));
                const years = Math.floor(totalMonths / 12);
                const remMonths = totalMonths % 12;
                if (years === 0) return `${remMonths} bln`;
                if (remMonths === 0) return `${years} th`;
                return `${years}th${remMonths}bln`;
            };

            // 4. Hitung Koordinat dan Gambar Titik
            
            // Resolve the actual chart key to get the correct math bounds for validation
            const getResolvedConfig = (key, xVal) => {
                return window.OfficialChartsDB[key] || null;
            };

            // Check if a value is within the chart grid's Y-axis range
            const isYInBounds = (key, xVal, yVal) => {
                const cfg = getResolvedConfig(key, xVal);
                if (!cfg) return true; // no config = no validation, allow drawing
                const mb = cfg.mathBounds;
                // Allow 5% margin outside bounds for dots near edges
                const margin = (mb.yMax - mb.yMin) * 0.05;
                return yVal >= (mb.yMin - margin) && yVal <= (mb.yMax + margin);
            };

            // Fungsi pembantu untuk menggambar satu titik
            const drawDot = (key, xVal, yVal, labelText, color = 'red', offsetType = 'tr') => {
                const radius = 3.5;
                if (yVal !== null && yVal !== undefined && !isNaN(xVal)) {
                    // Check if the dot would be off-chart (Y out of grid bounds)
                    if (!isYInBounds(key, xVal, yVal)) {
                        // Draw a boundary annotation instead of an invisible dot
                        const cfg = getResolvedConfig(key, xVal);
                        if (cfg) {
                            const mb = cfg.mathBounds;
                            const boundaryY = yVal < mb.yMin ? mb.yMin : mb.yMax;
                            const coords = window.calculateOfficialPixelCoords(key, Number(xVal), boundaryY);
                            if (coords) {
                                const arrowDir = yVal < mb.yMin ? 1 : -1; // 1=down arrow, -1=up arrow
                                ctx.save();
                                ctx.font = "bold 12px Arial";
                                ctx.fillStyle = color;
                                const arrow = arrowDir > 0 ? '▼' : '▲';
                                ctx.fillText(`${arrow} ${labelText}`, coords.x - 10, coords.y + (arrowDir * 16));
                                ctx.restore();
                            }
                        }
                        return;
                    }

                    const coords = window.calculateOfficialPixelCoords(key, Number(xVal), Number(yVal));
                    if (coords) {
                        ctx.beginPath();
                        // Draw a premium horizontal oval (ellipse)
                        const radiusX = radius * 1.4;
                        const radiusY = radius * 0.9;
                        ctx.ellipse(coords.x, coords.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.lineWidth = 1.0;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();

                        // Add a beautiful white target center to make it look premium
                        ctx.beginPath();
                        ctx.ellipse(coords.x, coords.y, radiusX * 0.4, radiusY * 0.4, 0, 0, 2 * Math.PI);
                        ctx.fillStyle = 'white';
                        ctx.fill();

                        ctx.font = "bold 14px Arial";
                        ctx.fillStyle = color;
                        
                        let textX = coords.x + 8;
                        let textY = coords.y - 8;
                        const textWidth = ctx.measureText(labelText).width;
                        
                        if (offsetType === 'tl') {
                            textX = coords.x - 8 - textWidth;
                            textY = coords.y - 8;
                        } else if (offsetType === 'bl') {
                            textX = coords.x - 8 - textWidth;
                            textY = coords.y + 16;
                        } else if (offsetType === 'br') {
                            textX = coords.x + 8;
                            textY = coords.y + 16;
                        } else if (offsetType === 'top') {
                            textX = coords.x - (textWidth / 2);
                            textY = coords.y - 12;
                        } else if (offsetType === 'bottom') {
                            textX = coords.x - (textWidth / 2);
                            textY = coords.y + 20;
                        }
                        
                        ctx.fillText(labelText, textX, textY);
                    }
                }
            };

            // Jika ini grafik CDC Stature/Weight (karena ada 2 grid dalam 1 PDF), gambar semuanya!
            if (activeRef === 'cdc' && (indicator === 'stature' || indicator === 'tbu' || indicator === 'weight' || indicator === 'bbu')) {
                const statKey = `cdc_${patient.gender}_stature`;
                const weightKey = `cdc_${patient.gender}_weight`;
                
                // Stature Grid Dots
                drawDot(statKey, patient.umur_dipakai, patient.tb, `TB/U (${Number(patient.tb).toFixed(1)}cm)`, 'red', 'tr');
                if (Number.isFinite(patient.haMonth)) {
                    drawDot(statKey, patient.haMonth, patient.tb, `HA (${formatAgeIndonesian(patient.haMonth)})`, 'blue', 'tl');
                }
                
                // Weight Grid Dots
                drawDot(weightKey, patient.umur_dipakai, patient.bbs, `BB/U (${Number(patient.bbs).toFixed(1)}kg)`, 'red', 'tr');
                if (Number.isFinite(patient.waMonth)) {
                    drawDot(weightKey, patient.waMonth, patient.bbs, `WA (${formatAgeIndonesian(patient.waMonth)})`, 'blue', 'tl');
                }
                if (Number.isFinite(patient.bbi)) {
                    const bbiX = Number.isFinite(patient.haMonth) ? patient.haMonth : patient.umur_dipakai;
                    drawDot(weightKey, bbiX, patient.bbi, `BBI (${Number(patient.bbi).toFixed(1)}kg)`, 'green', 'br');
                }
            } else {
                // Untuk WHO / CDC Chart lainnya (Single Grid)
                if (indicator === 'stature' || indicator === 'tbu') {
                    drawDot(chartKey, xAxisValue, yAxisValue, `TB/U (${Number(yAxisValue).toFixed(1)}cm)`, 'red', 'tr');
                    if (Number.isFinite(patient.haMonth)) {
                        drawDot(chartKey, patient.haMonth, yAxisValue, `HA (${formatAgeIndonesian(patient.haMonth)})`, 'blue', 'tl');
                    }
                } else if (indicator === 'weight' || indicator === 'bbu') {
                    drawDot(chartKey, xAxisValue, yAxisValue, `BB/U (${Number(yAxisValue).toFixed(1)}kg)`, 'red', 'tr');
                    if (Number.isFinite(patient.waMonth)) {
                        drawDot(chartKey, patient.waMonth, yAxisValue, `WA (${formatAgeIndonesian(patient.waMonth)})`, 'blue', 'tl');
                    }
                    if (Number.isFinite(patient.bbi)) {
                        const bbiX = Number.isFinite(patient.haMonth) ? patient.haMonth : patient.umur_dipakai;
                        drawDot(chartKey, bbiX, patient.bbi, `BBI (${Number(patient.bbi).toFixed(1)}kg)`, 'green', 'br');
                    }
                } else {
                    drawDot(chartKey, xAxisValue, yAxisValue, `${yAxisText}`, 'red', 'tr');
                }
            }

            // 5. Tambahkan Header Identitas Pasien di Kanan Atas
            const boxWidth = 350;
            const boxHeight = 85;
            const boxX = canvas.width - boxWidth - 30; // Kanan atas
            const boxY = 40;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            ctx.font = "bold 20px Arial";
            ctx.fillStyle = "black";
            const patientName = patient.nama ? patient.nama.substring(0, 25) : 'Pasien';
            ctx.fillText(`Nama: ${patientName}`, boxX + 20, boxY + 35);
            
            // Use full format for header box
            const ageTextFull = (() => {
                const totalMonths = Math.round(Number(patient.umur_dipakai));
                const years = Math.floor(totalMonths / 12);
                const remMonths = totalMonths % 12;
                if (years === 0) return `${remMonths} bulan`;
                if (remMonths === 0) return `${years} tahun`;
                return `${years} tahun ${remMonths} bulan`;
            })();
            ctx.fillText(`Usia: ${ageTextFull}`, boxX + 20, boxY + 65);
            
            // 6. Download Image
            const ageStr = activeRef === 'who' ? '0-5_Tahun' : '2-20_Tahun';
            const genderStr = patient.gender === 'male' ? 'Laki-laki' : 'Perempuan';
            
            let descriptiveInd = indicator.toUpperCase();
            if (indicator === 'stature' || indicator === 'tbu') descriptiveInd = 'Tinggi_Badan_Usia';
            if (indicator === 'weight' || indicator === 'bbu') descriptiveInd = 'Berat_Badan_Usia';
            if (indicator === 'bmi' || indicator === 'imtu') descriptiveInd = 'IMT_Usia';
            if (indicator === 'lku' || indicator === 'headcirc') descriptiveInd = 'Lingkar_Kepala_Usia';
            if (indicator === 'bbpb' || indicator === 'bbtb' || indicator === 'weight_length') descriptiveInd = 'Berat_Badan_Tinggi_Badan';

            const patientSafeName = (patient.nama || 'Anonim').replace(/[^a-z0-9]/gi, '_');
            const filename = `Grafik_${activeRef.toUpperCase()}_${ageStr}_${descriptiveInd}_${genderStr}_${patientSafeName}.png`;
            
            downloadCanvasAsImage(canvas, filename);

        } catch (err) {
            console.error("Gagal merender PDF resmi:", err);
            if (window.location.protocol === 'file:') {
                alert("Gagal memuat PDF: Browser memblokir akses file lokal (CORS).\n\nSolusi: Gunakan ekstensi 'Live Server' di VSCode atau jalankan web server lokal untuk membuka index.html agar fitur PDF berfungsi penuh.");
            } else {
                alert("Gagal memuat grafik PDF resmi. Menggunakan fallback...");
                downloadChartFallback(patient, indicator, activeRef, patient.gender);
            }
        }
    }

    // Fungsi asli yang menggunakan Chart.js (diubah namanya menjadi fallback)
    function downloadChartFallback(patient, indicator, activeRef, gender) {
        const module = getRefModule(activeRef);
        const canvas = document.createElement('canvas');
        canvas.width = 1200; canvas.height = 800;
        canvas.style.position = 'absolute'; canvas.style.left = '-9999px'; canvas.style.top = '-9999px';
        document.body.appendChild(canvas);
        
        const chartResult = module.buildChart(patient, indicator, gender);
        if (!chartResult || chartResult.error) {
            alert("Gagal membangun chart: " + (chartResult ? chartResult.error : ""));
            document.body.removeChild(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: { datasets: chartResult.datasets },
            plugins: Array.isArray(chartResult.plugins) ? chartResult.plugins : [],
            options: Object.assign({}, getChartOptions(chartResult), {
                animation: false, responsive: false, maintainAspectRatio: false
            })
        });
        
        setTimeout(() => {
            const ageStr = activeRef === 'who' ? '0-5_Tahun' : '2-20_Tahun';
            const genderStr = patient.gender === 'male' ? 'Laki-laki' : 'Perempuan';
            
            let descriptiveInd = indicator.toUpperCase();
            if (indicator === 'stature' || indicator === 'tbu') descriptiveInd = 'Tinggi_Badan_Usia';
            if (indicator === 'weight' || indicator === 'bbu') descriptiveInd = 'Berat_Badan_Usia';
            if (indicator === 'bmi' || indicator === 'imtu') descriptiveInd = 'IMT_Usia';
            if (indicator === 'lku' || indicator === 'headcirc') descriptiveInd = 'Lingkar_Kepala_Usia';
            if (indicator === 'bbpb' || indicator === 'bbtb' || indicator === 'weight_length') descriptiveInd = 'Berat_Badan_Tinggi_Badan';

            const patientSafeName = (patient.nama || 'Anonim').replace(/[^a-z0-9]/gi, '_');
            const filename = `Grafik_Fallback_${activeRef.toUpperCase()}_${ageStr}_${descriptiveInd}_${genderStr}_${patientSafeName}.png`;
            
            downloadCanvasAsImage(canvas, filename);
            chart.destroy();
            document.body.removeChild(canvas);
        }, 150);
    }

    function downloadAllChartsBackground() {
        const patient = window.hasilSementara;
        if (!patient) {
            alert("Mohon hitung data pasien terlebih dahulu.");
            return;
        }
        const age = Number(patient.umur_dipakai);
        const activeRef = getRefActive(age);
        const module = getRefModule(activeRef);
        
        const indicatorsToRender = module.options.filter(opt => {
            if (opt.value === 'lku' && !Number.isFinite(patient.lk)) return false;
            if (opt.value === 'bbpb' && (!Number.isFinite(patient.tb) || !Number.isFinite(patient.bbs))) return false;
            if (opt.value === 'imtu' && !Number.isFinite(patient.imt_value)) return false;
            if (opt.value === 'bmi' && !Number.isFinite(patient.imt_value)) return false;
            return true;
        });

        let delay = 0;
        indicatorsToRender.forEach((opt) => {
            setTimeout(() => {
                downloadChartBackground(opt.value);
            }, delay);
            delay += 350; // throttle downloads to prevent freezing
        });
    }

    window.GrowthChartShared = {
        destroyCurrentChart,
        destroyAllCharts,
        formatYearsFromMonths,
        createYearAxis,
        createNumericAxis
    };

    window.getRefActive = getRefActive;
    window.updateIndikatorGrafik = updateIndikatorGrafik;
    window.tampilkanGrafik = tampilkanGrafik;
    window.applyGraphSelection = applyGraphGenderSelection; // compatibility alias if any
    window.applyGraphGenderSelection = applyGraphGenderSelection;
    window.syncGraphGenderSelector = syncGraphGenderSelector;
    window.onTampilanGrafikChange = onTampilanGrafikChange;
    window.downloadCanvasAsImage = downloadCanvasAsImage;
    window.downloadActiveChart = downloadActiveChart;
    window.downloadAllCharts = downloadAllCharts;
    window.downloadChartBackground = downloadChartBackground;
    window.downloadAllChartsBackground = downloadAllChartsBackground;
})();
