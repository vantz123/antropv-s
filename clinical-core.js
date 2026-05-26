// ========================================================================
// ==================== FUNGSI UTILITAS ====================================
// ========================================================================

// Cache untuk meningkatkan performa interpolasi LMS
const __lmsCache = new WeakMap();
function __getSortedKeys(data) {
    if (__lmsCache.has(data)) return __lmsCache.get(data);
    const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
    __lmsCache.set(data, keys);
    return keys;
}

function getLMS(data, key) {
    if (!data) return null;
    const keys = __getSortedKeys(data);
    if (data[key] !== undefined) return data[key];
    if (key <= keys[0]) return data[keys[0]];
    if (key >= keys[keys.length - 1]) return data[keys[keys.length - 1]];
    // Binary search agar cepat & akurat
    let lo = 0, hi = keys.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (keys[mid] <= key) lo = mid; else hi = mid;
    }
    const lower = keys[lo], upper = keys[hi];
    const span = upper - lower;
    const t = span === 0 ? 0 : (key - lower) / span;
    const l = data[lower], u = data[upper];
    return {
        L: l.L + t * (u.L - l.L),
        M: l.M + t * (u.M - l.M),
        S: l.S + t * (u.S - l.S)
    };
}

function getLMS_CDC(dataArr, age) {
    if (!Array.isArray(dataArr) || dataArr.length === 0) return null;
    if (age <= dataArr[0][0]) return { L: dataArr[0][1], M: dataArr[0][2], S: dataArr[0][3] };
    if (age >= dataArr[dataArr.length - 1][0]) {
        const last = dataArr[dataArr.length - 1];
        return { L: last[1], M: last[2], S: last[3] };
    }
    // Binary search untuk segmen yang tepat
    let lo = 0, hi = dataArr.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (dataArr[mid][0] <= age) lo = mid; else hi = mid;
    }
    const a = dataArr[lo], b = dataArr[hi];
    const span = b[0] - a[0];
    const t = span === 0 ? 0 : (age - a[0]) / span;
    return {
        L: a[1] + t * (b[1] - a[1]),
        M: a[2] + t * (b[2] - a[2]),
        S: a[3] + t * (b[3] - a[3])
    };
}

// Hitung Z-Score LMS Cole dengan guard numeric
function hitungZScore(X, L, M, S, applyWhoAdjustment = false) {
    if (!Number.isFinite(X) || !Number.isFinite(M) || !Number.isFinite(S) || M <= 0 || S <= 0) return NaN;
    if (X <= 0) return NaN;
    let Z;
    if (Math.abs(L) < 1e-6) {
        Z = Math.log(X / M) / S;
    } else {
        const ratio = X / M;
        if (ratio <= 0) return NaN;
        Z = (Math.pow(ratio, L) - 1) / (L * S);
    }
    
    if (applyWhoAdjustment && Math.abs(Z) >= 3) {
        const sd2pos = M * Math.pow(1 + L * S * 2, 1 / L);
        const sd2neg = M * Math.pow(1 + L * S * -2, 1 / L);
        const sd3pos = M * Math.pow(1 + L * S * 3, 1 / L);
        const sd3neg = M * Math.pow(1 + L * S * -3, 1 / L);
        const sd23pos = sd3pos - sd2pos;
        const sd23neg = sd2neg - sd3neg;
        if (Z >= 3 && sd23pos !== 0) {
            Z = 3 + (X - sd3pos) / sd23pos;
        } else if (Z <= -3 && sd23neg !== 0) {
            Z = -3 + (X - sd3neg) / sd23neg;
        }
    }
    return Z;
}

// Konversi z-score ke nilai pengukuran (X) dengan guard
function calculateXFromZ(Z, L, M, S) {
    if (!Number.isFinite(Z) || !Number.isFinite(M) || !Number.isFinite(S) || M <= 0 || S <= 0) return NaN;
    if (Math.abs(L) < 1e-6) return M * Math.exp(S * Z);
    const inner = 1 + L * S * Z;
    if (inner <= 0) return NaN;
    return M * Math.pow(inner, 1 / L);
}

function percentileToZ(p) {
    if (p <= 0) return -5;
    if (p >= 100) return 5;
    const P = p / 100;
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969,
               138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
               66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184,
               -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143,
               3.75440866190742];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r;
    if (P < plow) {
        q = Math.sqrt(-2*Math.log(P));
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (P <= phigh) {
        q = P - 0.5;
        r = q*q;
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
               (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
        q = Math.sqrt(-2*Math.log(1-P));
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
}

function zToPercentile(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp(-z*z/2);
    let p = d * t * ((((1.330274429*t - 1.821255978)*t + 1.781477937)*t - 0.356563782)*t + 0.319381530);
    if (z > 0) p = 1 - p;
    return p * 100;
}

// Cari usia di mana median (WHO) = target. Mengembalikan { age, clamped }
// di mana clamped = true bila target di luar rentang data (untuk fallback).
function findAgeForMedian_WHO(data, target, options) {
    if (!data) return null;
    const keys = __getSortedKeys(data);
    const opts = options || {};
    const minM = data[keys[0]].M;
    const maxM = data[keys[keys.length - 1]].M;
    if (target <= minM) {
        return opts.returnDetail ? { age: keys[0], clamped: true } : keys[0];
    }
    if (target >= maxM) {
        return opts.returnDetail ? { age: keys[keys.length - 1], clamped: true } : keys[keys.length - 1];
    }
    // Cari segmen yang melingkupi target (asumsi M monoton naik untuk TB/BB)
    for (let i = 0; i < keys.length - 1; i++) {
        const a1 = keys[i], a2 = keys[i + 1];
        const m1 = data[a1].M, m2 = data[a2].M;
        if (target >= Math.min(m1, m2) && target <= Math.max(m1, m2) && m1 !== m2) {
            const age = a1 + (target - m1) / (m2 - m1) * (a2 - a1);
            return opts.returnDetail ? { age, clamped: false } : age;
        }
    }
    return null;
}

function findAgeForMedian_CDC(dataArr, target, options) {
    if (!Array.isArray(dataArr) || dataArr.length === 0) return null;
    const opts = options || {};
    const minM = dataArr[0][2];
    const maxM = dataArr[dataArr.length - 1][2];
    if (target <= minM) {
        return opts.returnDetail ? { age: dataArr[0][0], clamped: true } : dataArr[0][0];
    }
    if (target >= maxM) {
        return opts.returnDetail ? { age: dataArr[dataArr.length - 1][0], clamped: true } : dataArr[dataArr.length - 1][0];
    }
    for (let i = 0; i < dataArr.length - 1; i++) {
        const a1 = dataArr[i][0], a2 = dataArr[i + 1][0];
        const m1 = dataArr[i][2], m2 = dataArr[i + 1][2];
        if (target >= Math.min(m1, m2) && target <= Math.max(m1, m2) && m1 !== m2) {
            const age = a1 + (target - m1) / (m2 - m1) * (a2 - a1);
            return opts.returnDetail ? { age, clamped: false } : age;
        }
    }
    return null;
}

function koreksiTinggi(tb, umur, posisi) {
    if(!posisi) return tb;
    if(posisi==='terlentang' && umur>=24) return tb-0.7;
    if(posisi==='berdiri' && umur<24) return tb+0.7;
    return tb;
}

function hitungSelisihUsiaPresisi(tanggalLahir, tanggalUkur) {
    const lahir = new Date(tanggalLahir.getFullYear(), tanggalLahir.getMonth(), tanggalLahir.getDate());
    const ukur = new Date(tanggalUkur.getFullYear(), tanggalUkur.getMonth(), tanggalUkur.getDate());
    if (ukur < lahir) return null;

    let tahun = ukur.getFullYear() - lahir.getFullYear();
    let bulan = ukur.getMonth() - lahir.getMonth();
    let hari = ukur.getDate() - lahir.getDate();

    if (hari < 0) {
        const hariBulanSebelumnya = new Date(ukur.getFullYear(), ukur.getMonth(), 0).getDate();
        hari += hariBulanSebelumnya;
        bulan -= 1;
    }
    if (bulan < 0) {
        bulan += 12;
        tahun -= 1;
    }

    const totalBulan = (tahun * 12) + bulan + (hari / 30.4375);
    return { tahun, bulan, hari, totalBulan };
}

function formatTanggalInput(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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
function parseGender(text) {
    if (!text) return '';
    const t = text.toLowerCase().trim();
    // Match "perempuan", "p/", "/p/", "p ", standalone p/l
    if (/(?:^|\s|\/)perempuan(?:\s|$|\/)/i.test(t) || /\/p\//i.test(t) || /\/p\s/i.test(t) ||
        /\bp\b/.test(t.replace(/[.,]/g, ' ')) && !/\blaki/i.test(t)) {
        return 'female';
    }
    if (/(?:^|\s|\/)laki[- ]?laki(?:\s|$|\/)/i.test(t) || /\/l\//i.test(t) || /\/l\s/i.test(t) ||
        /\bl\b/.test(t.replace(/[.,]/g, ' '))) {
        return 'male';
    }
    return '';
}

// ==================== INTERPRETASI ====================
// Rentang WHO (Z-Score) - sesuai klasifikasi pada tab Interpretasi
function getRangeWHO(z, type) {
    if (!Number.isFinite(z)) return '';
    const zs = (z >= 0 ? '+' : '') + z.toFixed(2);
    if (type === 'bbu') {
        if (z < -3) return `Z < -3 (Severely Underweight)`;
        if (z < -2) return `-3 s/d -2 (Underweight)`;
        if (z < -1) return `-2 s/d -1 (Normoweight)`;
        if (z <= 1) return `-1 s/d +1 (Normoweight)`;
        if (z <= 2) return `+1 s/d +2 (Risk Overweight)`;
        return `Z > +2 (Overweight)`;
    }
    if (type === 'tbu') {
        if (z < -3) return `Z < -3 (Severely Stunted)`;
        if (z < -2) return `-3 s/d -2 (Stunted)`;
        if (z < -1) return `-2 s/d -1 (Normoheight)`;
        if (z <= 1) return `-1 s/d +1 (Normoheight)`;
        if (z <= 2) return `+1 s/d +2 (Normoheight)`;
        if (z <= 3) return `+2 s/d +3 (Tall)`;
        return `Z > +3 (Very Tall)`;
    }
    if (type === 'imtu' || type === 'bbpb' || type === 'bbtb') {
        if (z < -3) return `Z < -3 (Severely Wasted)`;
        if (z < -2) return `-3 s/d -2 (Wasted)`;
        if (z <= 1) return `-2 s/d +1 (Normal)`;
        if (z <= 2) return `+1 s/d +2 (Risk Overweight)`;
        if (z <= 3) return `+2 s/d +3 (Overweight)`;
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
        html += renderCard('📐', 'IMT/U (BMI-for-Age)', hasil.imtu_ref, hasil.imtu, pctVal, cls, rangeText, `IMT: ${hasil.imt_value.toFixed(2)} kg/m²`, hasil.imtu_ref_detail);
    }

    const bbtbMetricHtml = renderBBTBMetricCard(hasil, pBBI);
    if (bbtbMetricHtml) html += bbtbMetricHtml;

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

    // ==================== RINGKASAN RINGKAS ====================
    const statusUtama = getStatusUtama(hasil, lilaCls, umur, waMonth, haMonth, umurKron, pBBI);

    let ringkasanHtml = `<div class="result-card" style="border-left-color:#28a745; background:#f0fdf4;">
        <h3>📋 Ringkasan</h3>
        <table style="width:100%; font-size:1.05em;">
            <tr><td style="padding:4px 0;"><strong>BBS</strong></td><td>${Number.isFinite(bbs) ? bbs + ' kg' : '-'}</td></tr>
            <tr><td style="padding:4px 0;"><strong>BBI</strong></td><td>${bbiInfo && Number.isFinite(bbiInfo.bbi) ? bbiInfo.bbi.toFixed(2) + ' kg' : '-'}</td></tr>
            <tr><td style="padding:4px 0;"><strong>WA</strong></td><td>${wa || '-'}</td></tr>
            <tr><td style="padding:4px 0;"><strong>HA</strong></td><td>${ha || '-'}</td></tr>
            <tr style="border-top:2px solid #28a745;"><td style="padding:10px 0 4px 0;"><strong>Status</strong></td><td style="padding-top:10px;">${statusUtama.html}</td></tr>
        </table>
    </div>`;
    html += ringkasanHtml;

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
