// ==================== INTERPRETASI ====================
// Rentang WHO (Z-Score) - sesuai klasifikasi pada tab Interpretasi
function getRangeWHO(z, type) {
    if (!Number.isFinite(z)) return '';
    const zs = (z >= 0 ? '+' : '') + z.toFixed(2);
    if (type === 'bbu') {
        if (z < -3) return `Z < -3 (Severely Underweight)`;
        if (z < -2) return `-3 < Z < -2 (Underweight)`;
        if (z < -1) return `-2 < Z < -1 (Normoweight)`;
        if (z <= 1) return `-1 ≤ Z ≤ +1 (Normoweight)`;
        if (z <= 2) return `+1 < Z ≤ +2 (Risk Overweight)`;
        return `Z > +2 (Overweight)`;
    }
    if (type === 'tbu') {
        if (z < -3) return `Z < -3 (Severely Stunted)`;
        if (z < -2) return `-3 < Z < -2 (Stunted)`;
        if (z < -1) return `-2 < Z < -1 (Normoheight)`;
        if (z <= 1) return `-1 ≤ Z ≤ +1 (Normoheight)`;
        if (z <= 2) return `+1 < Z ≤ +2 (Normoheight)`;
        if (z <= 3) return `+2 < Z ≤ +3 (Tall)`;
        return `Z > +3 (Very Tall)`;
    }
    if (type === 'imtu' || type === 'bbpb' || type === 'bbtb') {
        if (z < -3) return `Z < -3 (Severely Wasted)`;
        if (z < -2) return `-3 < Z < -2 (Wasted)`;
        if (z <= 1) return `-2 ≤ Z ≤ +1 (Normal)`;
        if (z <= 2) return `+1 < Z ≤ +2 (Risk Overweight)`;
        if (z <= 3) return `+2 < Z ≤ +3 (Overweight)`;
        return `Z > +3 (Obese)`;
    }
    return '';
}

// Rentang CDC (Persentil) - sesuai klasifikasi pada tab Interpretasi
function getRangeCDC(pct, type) {
    if (!Number.isFinite(pct)) return '';
    const p = `P${pct.toFixed(1)}`;
    if (type === 'bmi') {
        if (pct < 5) return `< P5 (Underweight)`;
        if (pct < 25) return `P5 - P25 (Healthy Weight)`;
        if (pct < 75) return `P25 - P75 (Healthy Weight)`;
        if (pct < 85) return `P75 - P85 (Healthy Weight)`;
        if (pct < 95) return `P85 - P95 (Overweight)`;
        return `≥ P95 (Obesity)`;
    }
    
    if (type === 'stature') {
        if (pct < 3) return `< P3 (Short Stature)`;
        if (pct < 10) return `P3 - P10 (Normostature)`;
        if (pct < 25) return `P10 - P25 (Normostature)`;
        if (pct < 75) return `P25 - P75 (Normostature)`;
        if (pct <= 90) return `P75 - P90 (Normostature)`;
        if (pct <= 97) return `P90 - P97 (Tall)`;
        return `> P97 (Very Tall)`;
    }
    
    // weight (BB/U)
    if (pct < 3) return `< P3 (Underweight)`;
    if (pct < 10) return `P3 - P10 (Normoweight)`;
    if (pct < 25) return `P10 - P25 (Normoweight)`;
    if (pct < 75) return `P25 - P75 (Normoweight)`;
    if (pct <= 90) return `P75 - P90 (Normoweight)`;
    if (pct <= 97) return `P90 - P97 (Overweight)`;
    return `> P97 (Obesitas)`;
}

function classifyBBU_WHO(z){
    if(z<-3) return {txt:'Severely Underweight', badge:'status-severe'};
    if(z<-2) return {txt:'Underweight', badge:'status-moderate'};
    if(z<=1) return {txt:'Normoweight', badge:'status-normal'};
    if(z<=2) return {txt:'Risk Overweight', badge:'status-risk'};
    return {txt:'Overweight', badge:'status-obese'};
}

function classifyTBU_WHO(z){
    if(z<-3) return {txt:'Severely Stunted', badge:'status-severe'};
    if(z<-2) return {txt:'Stunted', badge:'status-moderate'};
    if(z<=3) return {txt:'Normoheight', badge:'status-normal'};
    return {txt:'Tall Stature', badge:'status-info'};
}

function classifyBBTB_WHO(z){
    if(z<-3) return {txt:'Gizi Buruk', badge:'status-severe'};
    if(z<-2) return {txt:'Gizi Kurang', badge:'status-moderate'};
    if(z<=2) return {txt:'Gizi Baik', badge:'status-normal'};
    if(z<=3) return {txt:'Gizi Lebih', badge:'status-risk'};
    return {txt:'Obesitas', badge:'status-obese'};
}

function classifyIMTU_WHO(z){
    if(z<-3) return {txt:'Severe Thinness', badge:'status-severe'};
    if(z<-2) return {txt:'Thinness', badge:'status-moderate'};
    if(z<=1) return {txt:'Normal', badge:'status-normal'};
    if(z<=2) return {txt:'Overweight Risk', badge:'status-risk'};
    if(z<=3) return {txt:'Overweight', badge:'status-moderate'};
    return {txt:'Obese', badge:'status-obese'};
}

// Klasifikasi CDC berdasarkan PERSENTIL
// Klasifikasi CDC berdasarkan persentil. Untuk BMI gunakan kriteria CDC resmi:
// <P5 underweight, P5-<P85 healthy, P85-<P95 overweight, ≥P95 obesity, ≥120% P95 severe obesity (perlu data tambahan).
function classifyCDC_Percentile(pct, type) {
    if (type === 'bmi') {
        if (!Number.isFinite(pct)) return { txt: 'Tidak terhitung', badge: 'status-info' };
        if (pct < 5) return { txt: 'Underweight', badge: 'status-severe' };
        if (pct < 85) return { txt: 'Healthy Weight', badge: 'status-normal' };
        if (pct < 95) return { txt: 'Overweight', badge: 'status-risk' };
        return { txt: 'Obesity', badge: 'status-obese' };
    }
    if (type === 'stature') {
        if (pct < 3) return { txt: 'Short Stature', badge: 'status-severe' };
        if (pct <= 97) return { txt: 'Normostature', badge: 'status-normal' };
        return { txt: 'Tall Stature', badge: 'status-info' };
    }
    // weight (BB/U) untuk anak <2 tahun pada CDC: gunakan persentil standar
    if (pct < 3) return { txt: 'Underweight', badge: 'status-severe' };
    if (pct < 10) return { txt: 'Normoweight', badge: 'status-normal' };
    if (pct <= 90) return { txt: 'Normoweight', badge: 'status-normal' };
    if (pct <= 97) return { txt: 'Overweight', badge: 'status-risk' };
    return { txt: 'Obesity', badge: 'status-obese' };
}

// Klasifikasi CDC berdasarkan Z-SCORE
function classifyCDC_Zscore(z, type){
    const low = type==='stature' ? 'Stunted' : 'Underweight';
    const sevLow = type==='stature' ? 'Severely Stunted' : 'Severely Underweight';
    const high = type==='stature' ? 'Tall Stature' : 'Overweight';
    if(z<-3) return {txt: sevLow, badge:'status-severe'};
    if(z<-2) return {txt: low, badge:'status-moderate'};
    if(z<=2) return {txt: (type==='stature'?'Normoheight':'Normoweight'), badge:'status-normal'};
    if(z<=3) return {txt: high, badge:'status-risk'};
    return {txt: 'Obesitas', badge:'status-obese'};
}

// %BBI CDC classification
function classifyPBBI(pct){
    if(pct<70) return {txt:'Gizi Buruk', badge:'status-severe'};
    if(pct<90) return {txt:'Gizi Kurang', badge:'status-moderate'};
    if(pct<=110) return {txt:'Gizi Baik', badge:'status-normal'};
    if(pct<=120) return {txt:'Gizi Lebih', badge:'status-risk'};
    return {txt:'Obesitas', badge:'status-obese'};
}

function classifyLILA(lila, umur){
    if (umur >= 6 && umur < 60) {
        if (lila < 11.5) return {txt:'SAM (Severe Acute Malnutrition)', badge:'status-severe'};
        if (lila < 12.5) return {txt:'MAM (Moderate Acute Malnutrition)', badge:'status-moderate'};
        return {txt:'Normal', badge:'status-normal'};
    }
    return lila < 23.5 ? {txt:'KEK (Kurang Energi Kronis)', badge:'status-moderate'}
                       : {txt:'Normal', badge:'status-normal'};
}

function classifyLK(z){
    if(z<-2) return {txt:'Mikrosefali', badge:'status-moderate'};
    if(z>2) return {txt:'Makrosefali', badge:'status-moderate'};
    return {txt:'Normal', badge:'status-normal'};
}

function formatUmur(bulan) {
    if (bulan === null || bulan === undefined || isNaN(bulan)) return '-';
    const th=Math.floor(bulan/12), bl=Math.round(bulan%12);
    return th>0?`${th} th ${bl} bln`:`${bl} bln`;
}

// ==================== BBI KLINIS (HA → P50 BB/U) ====================
function getCalculationMode() {
    const el = (typeof document !== 'undefined') ? document.getElementById('calculation_mode') : null;
    return (el && el.value) ? el.value : 'auto_split';
}

function isWhoOnlyMode(mode) {
    return mode === 'who_strict' || mode === 'who_extended' || mode === 'who_only';
}

function getCalculationModeMeta(mode) {
    const m = mode || 'auto_split';
    if (m === 'who_strict') return { label: 'WHO Only', badge: 'who', engine: 'WHO' };
    if (m === 'who_extended' || m === 'who_only') return { label: 'WHO Only', badge: 'who', engine: 'WHO' };
    if (m === 'cdc_only') return { label: 'CDC Only', badge: 'cdc', engine: 'CDC' };
    return { label: 'Auto Split (WHO/CDC)', badge: 'who', engine: 'AUTO' };
}

function getCalculationModeLabel(mode) {
    return getCalculationModeMeta(mode).label;
}

function getAgeBasisLabel(isPrematur) {
    return isPrematur ? 'Usia koreksi prematur' : 'Usia kronologis';
}

function renderAuditTrailCard(audit) {
    if (!audit) return '';
    const rows = [
        ['Mode kalkulasi', audit.modeLabel],
        ['Basis usia', audit.ageBasisLabel],
        ['Usia yang dipakai', Number.isFinite(audit.ageUsedMonth) ? `${audit.ageUsedMonth.toFixed(1)} bulan` : null],
        ['BB/U', audit.bbuRefDetail ? `${audit.bbuRef || '-'} — ${audit.bbuRefDetail}` : audit.bbuRef],
        ['TB/U', audit.tbuRefDetail ? `${audit.tbuRef || '-'} — ${audit.tbuRefDetail}` : audit.tbuRef],
        ['IMT/U', audit.imtuRefDetail ? `${audit.imtuRef || '-'} — ${audit.imtuRefDetail}` : audit.imtuRef],
        ['WA', audit.waSourceDetail ? `${audit.waRef || '-'} — ${audit.waSourceDetail}` : audit.waRef],
        ['HA', audit.haSourceDetail ? `${audit.haRef || '-'} — ${audit.haSourceDetail}` : audit.haRef],
        ['BBI', audit.bbiSourceDetail ? `${audit.bbiRef || '-'} — ${audit.bbiSourceDetail}` : audit.bbiRef]
    ].filter((row) => row[1]);

    if (!rows.length) return '';

    const noteParts = [audit.waNote, audit.haNote, audit.bbiNote].filter(Boolean);
    return `<details class="collapse-box" style="border-left: 4.5px solid #6f42c1; background: var(--card-bg);">
        <summary style="font-weight: 750; cursor: pointer; color: var(--text-color);">🧾 Audit Trail Klinis</summary>
        <div class="inner" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
            <table style="width:100%; font-size:0.92em; border-collapse:collapse; background: none;">
                ${rows.map(([label, value]) => `<tr><td style="padding:4px 0; width:160px; border:none; background:none;"><strong>${label}</strong></td><td style="padding:4px 0; border:none; background:none;">${value}</td></tr>`).join('')}
            </table>
            ${noteParts.length ? `<div class="range-info" style="margin-top:8px;"><strong>Catatan:</strong> ${noteParts.join(' | ')}</div>` : ''}
        </div>
    </details>`;
}

function buildCalcNote(parts) {
    return parts.filter(Boolean).join(' ');
}

function calculateHAWhoStrict(tb, gender) {
    if (!Number.isFinite(tb) || tb <= 0 || !gender || !whoData[gender]) return null;
    const who519 = (typeof who519Data !== 'undefined') ? who519Data[gender] : null;
    const det05 = whoData[gender].tbu ? findAgeForMedian_WHO(whoData[gender].tbu, tb, { returnDetail: true }) : null;
    if (det05 && !det05.clamped) {
        return { age: det05.age, ref: 'WHO', sourceDetail: 'WHO HFA 0-5 tahun', note: null };
    }
    const det519 = who519 && who519.hfa ? findAgeForMedian_WHO(who519.hfa, tb, { returnDetail: true }) : null;
    if (det519 && !det519.clamped) {
        return { age: det519.age, ref: 'WHO', sourceDetail: 'WHO HFA 5-19 tahun', note: null };
    }
    return null;
}

function calculateWAWhoStrict(bb, gender, umurKron) {
    if (!Number.isFinite(bb) || bb <= 0 || !gender || !whoData[gender]) return null;
    if (Number.isFinite(umurKron) && umurKron > 120) {
        return { age: null, ref: 'WHO', sourceDetail: 'WHO WFA 0-10 tahun', note: 'WA WHO hanya didukung sampai 120 bulan.' };
    }
    const who519 = (typeof who519Data !== 'undefined') ? who519Data[gender] : null;
    const det05 = whoData[gender].bbu ? findAgeForMedian_WHO(whoData[gender].bbu, bb, { returnDetail: true }) : null;
    if (det05 && !det05.clamped) {
        return { age: det05.age, ref: 'WHO', sourceDetail: 'WHO WFA 0-5 tahun', note: null };
    }
    const det510 = who519 && who519.wfa ? findAgeForMedian_WHO(who519.wfa, bb, { returnDetail: true }) : null;
    if (det510 && !det510.clamped) {
        return { age: det510.age, ref: 'WHO', sourceDetail: 'WHO WFA 5-10 tahun', note: null };
    }
    return { age: null, ref: 'WHO', sourceDetail: 'WHO WFA 0-10 tahun', note: 'Berat berada di luar domain inverse lookup WHO.' };
}

function calculateHACDC(tb, gender) {
    if (!Number.isFinite(tb) || tb <= 0 || !gender || !cdcData[gender]) return null;
    const det = findAgeForMedian_CDC(cdcData[gender].stature, tb, { returnDetail: true });
    if (!det) return null;
    return {
        age: det.age,
        ref: 'CDC',
        sourceDetail: 'CDC Stature-for-Age',
        note: null
    };
}

function calculateWACDC(bb, gender) {
    if (!Number.isFinite(bb) || bb <= 0 || !gender || !cdcData[gender]) return null;
    const det = findAgeForMedian_CDC(cdcData[gender].weight, bb, { returnDetail: true });
    if (!det) return null;
    return {
        age: det.age,
        ref: 'CDC',
        sourceDetail: 'CDC Weight-for-Age',
        note: null
    };
}

function getMedianWeightWhoByAge(age, gender) {
    if (!Number.isFinite(age) || !gender) return null;
    const who519 = (typeof who519Data !== 'undefined') ? who519Data[gender] : null;
    if (age <= 60 && whoData[gender] && whoData[gender].bbu) {
        const lms = getLMS(whoData[gender].bbu, age);
        if (lms) return { value: lms.M, sourceDetail: 'WHO WFA 0-5 tahun' };
    }
    if (age <= 120 && who519 && who519.wfa) {
        const lms = getLMS(who519.wfa, age);
        if (lms) return { value: lms.M, sourceDetail: 'WHO WFA 5-10 tahun' };
    }
    return null;
}

function getMedianBMIWhoByAge(age, gender) {
    if (!Number.isFinite(age) || !gender) return null;
    const who519 = (typeof who519Data !== 'undefined') ? who519Data[gender] : null;
    if (age <= 60 && whoData[gender] && whoData[gender].imtu) {
        const lms = getLMS(whoData[gender].imtu, age);
        if (lms) return { value: lms.M, sourceDetail: 'WHO BMI/U 0-5 tahun' };
    }
    if (who519 && who519.bmi) {
        const lms = getLMS(who519.bmi, age);
        if (lms) return { value: lms.M, sourceDetail: 'WHO BMI/U 5-19 tahun' };
    }
    return null;
}

function calculateBBIWhoSeparated(tb, gender, umurKron, mode) {
    const haInfo = calculateHAWhoStrict(tb, gender);
    if (!haInfo || !Number.isFinite(haInfo.age)) return null;
    const noteParts = [haInfo.note];
    const medianWeight = getMedianWeightWhoByAge(haInfo.age, gender);
    if (medianWeight && Number.isFinite(medianWeight.value)) {
        return {
            bbi: medianWeight.value,
            ha: haInfo.age,
            ref: 'WHO',
            sourceDetail: medianWeight.sourceDetail,
            note: buildCalcNote(noteParts),
            calculation_mode: mode || 'who_strict'
        };
    }
    if (mode === 'who_extended' || mode === 'who_only') {
        const medianBMI = getMedianBMIWhoByAge(haInfo.age, gender);
        if (medianBMI && Number.isFinite(medianBMI.value) && Number.isFinite(tb) && tb > 0) {
            noteParts.push('HA > 120 bulan, BBI memakai fallback app: median BMI/U × TB².');
            return {
                bbi: medianBMI.value * ((tb / 100) ** 2),
                ha: haInfo.age,
                ref: 'WHO',
                sourceDetail: medianBMI.sourceDetail + ' (fallback app)',
                note: buildCalcNote(noteParts),
                calculation_mode: mode === 'who_only' ? 'who_only' : 'who_extended'
            };
        }
    }
    noteParts.push('HA > 120 bulan tidak memiliki median BB/U WHO.');
    if (mode === 'who_strict') noteParts.push('Pada mode WHO Strict, BBI dikosongkan.');
    return {
        bbi: null,
        ha: haInfo.age,
        ref: 'WHO',
        sourceDetail: 'WHO HFA/WFA',
        note: buildCalcNote(noteParts),
        calculation_mode: mode || 'who_strict'
    };
}

function calculateBBICDCSeparated(tb, gender) {
    const haInfo = calculateHACDC(tb, gender);
    if (!haInfo || !Number.isFinite(haInfo.age) || !cdcData[gender]) return null;
    const lms = getLMS_CDC(cdcData[gender].weight, haInfo.age);
    if (!lms || !Number.isFinite(lms.M)) return null;
    return {
        bbi: lms.M,
        ha: haInfo.age,
        ref: 'CDC',
        sourceDetail: 'CDC Weight-for-Age (median pada HA)',
        note: haInfo.note || null,
        calculation_mode: 'cdc_only'
    };
}

function calculateSummaryAgesByMode(gender, umurKron, bbs, tb, mode) {
    let waMonth = null, haMonth = null, waRef = null, haRef = null, waNote = null, haNote = null;
    let waSourceDetail = null, haSourceDetail = null;

    if (!isNaN(bbs)) {
        if (mode === 'cdc_only') {
            const waInfo = calculateWACDC(bbs, gender);
            if (waInfo) {
                waMonth = waInfo.age;
                waRef = waInfo.ref;
                waNote = waInfo.note || null;
                waSourceDetail = waInfo.sourceDetail || null;
            }
        } else if (isWhoOnlyMode(mode)) {
            const waInfo = calculateWAWhoStrict(bbs, gender, umurKron);
            if (waInfo) {
                waMonth = waInfo.age;
                waRef = waInfo.ref;
                waNote = waInfo.note || null;
                waSourceDetail = waInfo.sourceDetail || null;
            }
        } else {
            // Auto split: use CDC for > 60 months, WHO otherwise
            if (umurKron > 60) {
                const waInfo = calculateWACDC(bbs, gender);
                if (waInfo) {
                    waMonth = waInfo.age;
                    waRef = waInfo.ref;
                    waNote = waInfo.note || null;
                    waSourceDetail = waInfo.sourceDetail || null;
                }
            } else {
                const waInfo = calculateWAWhoStrict(bbs, gender, umurKron);
                if (waInfo) {
                    waMonth = waInfo.age;
                    waRef = waInfo.ref;
                    waNote = waInfo.note || null;
                    waSourceDetail = waInfo.sourceDetail || null;
                }
            }
        }
    }

    if (!isNaN(tb)) {
        if (mode === 'cdc_only') {
            const haInfo = calculateHACDC(tb, gender);
            if (haInfo) {
                haMonth = haInfo.age;
                haRef = haInfo.ref;
                haNote = haInfo.note || null;
                haSourceDetail = haInfo.sourceDetail || null;
            }
        } else if (isWhoOnlyMode(mode)) {
            const haInfo = calculateHAWhoStrict(tb, gender);
            if (haInfo) {
                haMonth = haInfo.age;
                haRef = haInfo.ref;
                haNote = haInfo.note || null;
                haSourceDetail = haInfo.sourceDetail || null;
            }
        } else {
            if (umurKron > 60) {
                const haInfo = calculateHACDC(tb, gender);
                if (haInfo) {
                    haMonth = haInfo.age;
                    haRef = haInfo.ref;
                    haNote = haInfo.note || null;
                    haSourceDetail = haInfo.sourceDetail || null;
                }
            } else {
                const haInfo = calculateHAWhoStrict(tb, gender);
                if (haInfo) {
                    haMonth = haInfo.age;
                    haRef = haInfo.ref;
                    haNote = haInfo.note || null;
                    haSourceDetail = haInfo.sourceDetail || null;
                }
            }
        }
    }

    return { waMonth, haMonth, waRef, haRef, waNote, haNote, waSourceDetail, haSourceDetail };
}

function calculateAnthropometryByMode(gender, umur, bbs, tb, lk, mode) {
    const hasil = {};
    const who519 = (typeof who519Data !== 'undefined') ? who519Data[gender] : null;
    const useCDC = mode === 'cdc_only' || (mode === 'auto_split' && umur > 60);

    if (!useCDC) {
        const data = whoData[gender];
        if (!data) return hasil;
        if (!isNaN(bbs)) {
            if (umur <= 60 && data.bbu) {
                const lms = getLMS(data.bbu, umur);
                if (lms) {
                    hasil.bbu = hitungZScore(bbs, lms.L, lms.M, lms.S, true);
                    hasil.bbu_ref = 'WHO';
                    hasil.bbu_ref_detail = 'WHO WFA 0-5 tahun';
                }
            } else if (umur <= 120 && who519 && who519.wfa) {
                const lms = getLMS(who519.wfa, umur);
                if (lms) {
                    hasil.bbu = hitungZScore(bbs, lms.L, lms.M, lms.S, true);
                    hasil.bbu_ref = 'WHO';
                    hasil.bbu_ref_detail = 'WHO WFA 5-10 tahun';
                }
            }
        }
        if (!isNaN(tb)) {
            if (umur <= 60 && data.tbu) {
                const lms = getLMS(data.tbu, umur);
                if (lms) {
                    hasil.tbu = hitungZScore(tb, lms.L, lms.M, lms.S);
                    hasil.tbu_ref = 'WHO';
                    hasil.tbu_ref_detail = 'WHO HFA 0-5 tahun';
                }
            } else if (who519 && who519.hfa) {
                const lms = getLMS(who519.hfa, umur);
                if (lms) {
                    hasil.tbu = hitungZScore(tb, lms.L, lms.M, lms.S);
                    hasil.tbu_ref = 'WHO';
                    hasil.tbu_ref_detail = 'WHO HFA 5-19 tahun';
                }
            }
        }
        if (!isNaN(bbs) && !isNaN(tb)) {
            const imt = bbs / ((tb / 100) ** 2);
            hasil.imt_value = imt;
            if (umur <= 60 && data.bbpb && tb >= 45 && tb <= 110) {
                const lmsBBTB = getLMS(data.bbpb, tb);
                if (lmsBBTB) {
                    hasil.bbtb = hitungZScore(bbs, lmsBBTB.L, lmsBBTB.M, lmsBBTB.S, true);
                    hasil.bbtb_ref = 'WHO';
                    hasil.bbtb_ref_detail = 'WHO BB/PB-TB';
                }
            }
            const lmsImt = umur <= 60 ? (data.imtu ? getLMS(data.imtu, umur) : null) : (who519 && who519.bmi ? getLMS(who519.bmi, umur) : null);
            if (lmsImt) {
                hasil.imtu = hitungZScore(imt, lmsImt.L, lmsImt.M, lmsImt.S, true);
                hasil.imtu_ref = 'WHO';
                hasil.imtu_ref_detail = umur <= 60 ? 'WHO BMI/U 0-5 tahun' : 'WHO BMI/U 5-19 tahun';
            }
        }
        if (!isNaN(lk) && umur <= 60 && data.lku) {
            const lms = getLMS(data.lku, umur);
            if (lms) hasil.lku = hitungZScore(lk, lms.L, lms.M, lms.S);
        }
        return hasil;
    }

    const cdcG = cdcData[gender];
    if (!cdcG) return hasil;
    if (!isNaN(bbs)) {
        const lms = getLMS_CDC(cdcG.weight, umur);
        if (lms) {
            hasil.bbu = hitungZScore(bbs, lms.L, lms.M, lms.S);
            hasil.bbu_pct = zToPercentile(hasil.bbu);
            hasil.bbu_ref = 'CDC';
            hasil.bbu_ref_detail = 'CDC Weight-for-Age';
        }
    }
    if (!isNaN(tb)) {
        const lms = getLMS_CDC(cdcG.stature, umur);
        if (lms) {
            hasil.tbu = hitungZScore(tb, lms.L, lms.M, lms.S);
            hasil.tbu_pct = zToPercentile(hasil.tbu);
            hasil.tbu_ref = 'CDC';
            hasil.tbu_ref_detail = 'CDC Stature-for-Age';
        }
    }
    if (!isNaN(bbs) && !isNaN(tb)) {
        const imt = bbs / ((tb / 100) ** 2);
        const lms = getLMS_CDC(cdcG.bmi, umur);
        hasil.imt_value = imt;
        if (lms) {
            hasil.imtu = hitungZScore(imt, lms.L, lms.M, lms.S);
            hasil.imtu_pct = zToPercentile(hasil.imtu);
            hasil.imtu_ref = 'CDC';
            hasil.imtu_ref_detail = 'CDC BMI-for-Age';
        }
    }
    return hasil;
}

// BBI Klinis: cari Height Age (HA) = usia di mana median TB/U = TB pasien.
// Lalu BBI = median BB/U pada usia HA. Jalur WHO dan CDC kini dipisah agar tidak saling override.
// Pada mode auto_split, tabel klinis IDAI digunakan sebagai sumber primer (sesuai praktik
// rumah sakit di Indonesia) ketika tersedia, dengan fallback otomatis WHO/CDC.
function hitungBBIKlinis_fn(tb, gender, umurKron, mode) {
    if (!Number.isFinite(tb) || tb <= 0 || !gender) return null;
    const calcMode = mode || getCalculationMode();
    if (calcMode === 'cdc_only') {
        return calculateBBICDCSeparated(tb, gender);
    }
    if (isWhoOnlyMode(calcMode)) {
        return calculateBBIWhoSeparated(tb, gender, umurKron, calcMode);
    }
    // BBI klinis dari sumber asli
    if (Number.isFinite(umurKron) && umurKron > 60) {
        return calculateBBICDCSeparated(tb, gender);
    }
    return calculateBBIWhoSeparated(tb, gender, umurKron, 'who_extended');
}

// ========================================================================
// ==================== HITUNG UTAMA =======================================
// ========================================================================
