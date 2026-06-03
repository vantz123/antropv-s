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
