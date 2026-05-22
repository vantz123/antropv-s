// ============================================================================
// PARSER MODUL — Robust, multi-format, anti-bug
// ============================================================================
// Mendukung:
//  - Gender: L/P, l/p, /L/, /P/, "Laki-laki", "Perempuan", "male", "female",
//    "boy", "girl", "pria", "wanita"
//  - Usia multi-unit: tahun + bulan + minggu + hari (semua kombinasi)
//  - Tanggal lahir + tanggal ukur (format: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY,
//    "12 Maret 2020", "March 12 2020", dengan/atau tanpa label "Tgl Lahir")
//  - Pengukuran: BB/Berat, TB/PB/Tinggi/Panjang, LK/Lingkar Kepala, LiLA, BBL
//  - Toleran: koma desimal, satu baris atau multi baris, urutan apapun
//  - Aman: tidak salah tangkap "BB Lahir" sebagai BB sekarang, tidak menangkap
//    "minggu" gestasi sebagai usia minggu (gestasi punya keyword sendiri).
// ============================================================================

(function () {
    const MONTH_MAP = {
        januari: 0, january: 0, jan: 0,
        februari: 1, february: 1, feb: 1,
        maret: 2, march: 2, mar: 2,
        april: 3, apr: 3,
        mei: 4, may: 4,
        juni: 5, june: 5, jun: 5,
        juli: 6, july: 6, jul: 6,
        agustus: 7, august: 7, agu: 7, aug: 7,
        september: 8, sep: 8, sept: 8,
        oktober: 9, october: 9, okt: 9, oct: 9,
        november: 10, nov: 10,
        desember: 11, december: 11, des: 11, dec: 11
    };

    function parseFloatSafe(value) {
        if (value === null || value === undefined) return NaN;
        const s = String(value).trim().replace(',', '.');
        const f = parseFloat(s);
        return Number.isFinite(f) ? f : NaN;
    }

    function parseFlexibleDate(text) {
        if (!text) return null;
        const t = String(text).trim();

        // ISO: 2020-03-12 atau 2020/03/12
        let m = t.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
        if (m) {
            const y = +m[1], mo = +m[2] - 1, d = +m[3];
            const dt = new Date(y, mo, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
        }

        // DD/MM/YYYY atau D-M-YY
        m = t.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
        if (m) {
            let y = +m[3]; if (y < 100) y += 2000;
            const mo = +m[2] - 1, d = +m[1];
            const dt = new Date(y, mo, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
        }

        // "12 Maret 2020" atau "12 March 2020"
        m = t.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
        if (m) {
            const moIdx = MONTH_MAP[m[2].toLowerCase()];
            if (moIdx !== undefined) {
                const dt = new Date(+m[3], moIdx, +m[1]);
                return Number.isNaN(dt.getTime()) ? null : dt;
            }
        }

        // "Maret 12, 2020" atau "March 12 2020"
        m = t.match(/([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (m) {
            const moIdx = MONTH_MAP[m[1].toLowerCase()];
            if (moIdx !== undefined) {
                const dt = new Date(+m[3], moIdx, +m[2]);
                return Number.isNaN(dt.getTime()) ? null : dt;
            }
        }

        return null;
    }

    function formatDateForInput(date) {
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${mo}-${d}`;
    }

    // Hapus segmen gestasi & tanggal dari teks supaya tidak salah tangkap
    function maskOutGestasi(text) {
        return text
            .replace(/(?:usia\s*gestasi|gestasi|gestation|usia\s*kehamilan|kehamilan|\bGA\b)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:minggu|mgg|week|wk|w)?/gi, ' ')
            .replace(/(?:tgl\s*lahir|tanggal\s*lahir|lahir(?:\s*pada)?|dob|date\s*of\s*birth)\s*[:=]?\s*[^\n]+/gi, ' ')
            .replace(/(?:tgl\s*ukur|tanggal\s*ukur|diukur(?:\s*tgl)?|measurement\s*date|date\s*measured)\s*[:=]?\s*[^\n]+/gi, ' ');
    }

    function parseAgeComponents(text) {
        if (!text) return null;
        const cleaned = maskOutGestasi(String(text));
        const lc = cleaned.toLowerCase();

        const yearMatch = lc.match(/(\d+(?:[.,]\d+)?)\s*(?:tahun|thn|th\b|yrs?\b|years?\b|yo\b|y\b)/);
        const monthMatch = lc.match(/(\d+(?:[.,]\d+)?)\s*(?:bulan|bln|mos?\b|months?\b|mo\b|m\b(?!\s*(?:cm|kg)))/);
        const weekMatch = lc.match(/(\d+(?:[.,]\d+)?)\s*(?:minggu|mgg|wks?\b|weeks?\b)/);
        const dayMatch = lc.match(/(\d+(?:[.,]\d+)?)\s*(?:hari|hr\b|days?\b|d\b(?!\s*(?:cm|kg)))/);

        const years = yearMatch ? parseFloatSafe(yearMatch[1]) : 0;
        const months = monthMatch ? parseFloatSafe(monthMatch[1]) : 0;
        const weeks = weekMatch ? parseFloatSafe(weekMatch[1]) : 0;
        const days = dayMatch ? parseFloatSafe(dayMatch[1]) : 0;

        const anyHit = (years > 0) || (months > 0) || (weeks > 0) || (days > 0);
        if (!anyHit) return null;

        const totalDays = (weeks * 7) + days;
        const totalMonths = (years * 12) + months + (totalDays / 30.4375);
        return { years, months, weeks, days, totalDays, totalMonths };
    }

    function parseGenderRobust(text) {
        if (!text) return '';
        const t = String(text);
        // Pola eksplisit
        if (/\b(perempuan|female|girl|wanita)\b/i.test(t)) return 'female';
        if (/\b(laki[- ]?laki|male|boy|pria)\b/i.test(t)) return 'male';
        // Substring "laki" tanpa boundary akhir kata Indonesia ("Bayi laki, ...")
        if (/\blaki\b/i.test(t)) return 'male';
        // Slash markers "/P/" "/L/"
        if (/\/\s*p\s*\//i.test(t)) return 'female';
        if (/\/\s*l\s*\//i.test(t)) return 'male';
        // "JK: L" / "Gender: P"
        const jk = t.match(/(?:jk|jenis\s*kelamin|gender|sex)\s*[:=]\s*([lpLP])\b/);
        if (jk) return jk[1].toLowerCase() === 'p' ? 'female' : 'male';
        // Pola pendek dipisahkan slash/spasi/koma
        if (/[\/\s,;]p[\/\s,;]/i.test(' ' + t + ' ')) return 'female';
        if (/[\/\s,;]l[\/\s,;]/i.test(' ' + t + ' ')) return 'male';
        return '';
    }

    function parseMeasurement(text, key, unit) {
        // Pola: KEY [:=]? value [unit]?  — toleran satu/multi baris
        // Untuk BB, hindari "BB Lahir" / "BBL"
        let pattern;
        switch (key) {
            case 'bb':
                // Hindari "BB Lahir", "BBL", "Birth Weight". Tambah label "Weight" / "W" eksplisit.
                pattern = /(?:^|[\n,;]|\s)(?:(?:berat\s*badan)|(?:bb)(?!l\b)(?!\s*lahir)|berat(?!\s*lahir)|weight(?!\s*at\s*birth)|\bw)\s*(?:sekarang|saat\s*ini|current)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilogram|g(?!\w))?/i;
                break;
            case 'tb':
                pattern = /(?:^|[\n,;]|\s)(?:tb|pb|tinggi(?:\s*badan)?|panjang(?:\s*badan)?|height|length)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b)?/i;
                break;
            case 'lk':
                pattern = /(?:^|[\n,;]|\s)(?:lk|lingkar\s*kepala|head\s*circ(?:umference)?|hc)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i;
                break;
            case 'lila':
                pattern = /(?:^|[\n,;]|\s)li?la(?:\s*\(muac\))?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i;
                break;
            case 'bbl':
                pattern = /(?:^|[\n,;]|\s)(?:bbl|bb\s*lahir|berat\s*lahir|birth\s*weight)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|g(?!\w))?/i;
                break;
            default:
                return NaN;
        }
        const m = text.match(pattern);
        if (!m) return NaN;
        let value = parseFloatSafe(m[1]);
        // Konversi unit: bila key=bb/bbl dan diakhir 'g' (gram, bukan kg) — jarang, abaikan default kg
        return Number.isFinite(value) ? value : NaN;
    }

    function parseNama(text) {
        if (!text) return 'Anonim';
        const lines = String(text).split(/\n+/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const m = line.match(/^(?:nama\s*[:=]\s*)?(?:An\.?\s*|Ny\.?\s*|Tn\.?\s*|Sdr\.?\s*|Tn\s+|Ny\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.\-]{0,60}?)\s*(?:\/|,|;|$)/);
            if (m && m[1]) {
                const candidate = m[1].trim();
                // Reject nama yang seluruhnya angka atau kata kunci
                if (!/^\d+$/.test(candidate) && candidate.length >= 2 && !/^(bb|tb|pb|lk|lila|bbl|umur|usia|gestasi)$/i.test(candidate)) {
                    return candidate;
                }
            }
        }
        return 'Anonim';
    }

    function parseDanHitung() {
        const text = document.getElementById('parserInput').value;
        if (!text || !text.trim()) {
            alert('Mohon tempel data terlebih dahulu.');
            return;
        }

        const nama = parseNama(text);
        const gender = parseGenderRobust(text);
        const ageParts = parseAgeComponents(text);

        // Gestasi
        let gestasi = null;
        const gaMatch = text.match(/(?:usia\s*gestasi|gestasi|gestation|usia\s*kehamilan|kehamilan|\bGA\b)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:minggu|mgg|week|wk|w)?\b/i);
        if (gaMatch) gestasi = parseFloatSafe(gaMatch[1]);

        // Pengukuran
        const bbs = parseMeasurement(text, 'bb');
        const tb = parseMeasurement(text, 'tb');
        const lk = parseMeasurement(text, 'lk');
        const lila = parseMeasurement(text, 'lila');
        const bbl = parseMeasurement(text, 'bbl');

        // Tanggal
        let dobDate = null, ukurDate = null;
        const dobLine = text.match(/(?:tgl\s*lahir|tanggal\s*lahir|lahir(?:\s*pada)?|dob|date\s*of\s*birth)\s*[:=]?\s*([^\n]+)/i);
        if (dobLine) dobDate = parseFlexibleDate(dobLine[1]);
        const ukurLine = text.match(/(?:tgl\s*ukur|tanggal\s*ukur|diukur(?:\s*tgl)?|measurement\s*date|date\s*measured)\s*[:=]?\s*([^\n]+)/i);
        if (ukurLine) ukurDate = parseFlexibleDate(ukurLine[1]);

        // Set ke field
        document.getElementById('nama').value = nama;
        document.getElementById('gender').value = gender || '';
        document.getElementById('bbs').value = Number.isFinite(bbs) ? bbs : '';
        document.getElementById('tb').value = Number.isFinite(tb) ? tb : '';
        document.getElementById('lk').value = Number.isFinite(lk) ? lk : '';
        document.getElementById('lila').value = Number.isFinite(lila) ? lila : '';
        document.getElementById('bbl').value = Number.isFinite(bbl) ? bbl : '';
        document.getElementById('usia_gestasi').value = (gestasi !== null && Number.isFinite(gestasi)) ? gestasi : '';

        // PERBAIKAN PENTING: Bila ageParts diberikan di teks, parser harus memprioritaskan
        // ageParts dan menghitung-mundur DOB dari tanggal ukur. Jika DOB lama (dari run sebelumnya)
        // masih nyangkut di field, bersihkan agar tidak menimbulkan hasil yang salah.
        if (dobDate) {
            document.getElementById('dob').value = formatDateForInput(dobDate);
        } else if (ageParts) {
            // Akan diisi-mundur lewat hitungMundurDOB di bawah; bersihkan dulu agar tidak konflik
            document.getElementById('dob').value = '';
        }
        if (ukurDate) {
            document.getElementById('tanggal_ukur').value = formatDateForInput(ukurDate);
        } else if (!document.getElementById('tanggal_ukur').value) {
            const today = new Date();
            document.getElementById('tanggal_ukur').value = formatDateForInput(today);
            ukurDate = today;
        }

        // Hindari deteksi posisi dari teks bila bertentangan dengan usia
        const explicitTerlentang = /\b(terlentang|supine|recumbent|posisi\s*tidur|berbaring)\b/i.test(text);
        const explicitBerdiri = /\b(berdiri|standing|posisi\s*berdiri)\b/i.test(text);
        if (explicitTerlentang) document.getElementById('posisi').value = 'terlentang';
        else if (explicitBerdiri) document.getElementById('posisi').value = 'berdiri';

        window.lastParsedAgeParts = ageParts;
        window.lastAgeComputation = null;

        // Logika prioritas umur (REVISI):
        //   1. Bila ageParts diberikan di teks parser → SELALU prioritaskan ageParts
        //      (hitung mundur DOB dari tgl ukur). Ini agar parsing teks ulang tidak
        //      tersesat oleh DOB lama yang tertinggal di field.
        //   2. Bila DOB diberikan di teks parser (bukan dari run sebelumnya) → hitung
        //      umur dari DOB + tgl ukur (paling presisi).
        //   3. Bila hanya DOB tersedia → tgl ukur default hari ini.
        if (ageParts) {
            document.getElementById('umur_bulan').value = ageParts.totalMonths.toFixed(2);
            document.getElementById('umur_tahun').value = (ageParts.totalMonths / 12).toFixed(3);
            if (!document.getElementById('posisi').value) {
                document.getElementById('posisi').value = ageParts.totalMonths < 24 ? 'terlentang' : 'berdiri';
            }
            hitungMundurDOB(ageParts);
        } else if (document.getElementById('dob').value && document.getElementById('tanggal_ukur').value) {
            hitungUmur();
        } else if (document.getElementById('dob').value) {
            hitungUmur();
        }

        hitungKoreksiUsia();
        hitungSemua();
    }

    function clearParser() {
        document.getElementById('parserInput').value = '';
        window.lastParsedAgeParts = null;
        window.lastAgeComputation = null;
    }

    function onGenderChange() {
        const gender = document.getElementById('gender').value;
        if (window.hasilSementara) {
            window.hasilSementara.gender = gender;
        }
        const graphGender = document.getElementById('gender_grafik');
        if (graphGender && gender && graphGender.value !== gender) graphGender.value = gender;
        const bbiGender = document.getElementById('bbi_gender');
        if (bbiGender && gender) bbiGender.value = gender;
        const tpgGender = document.getElementById('tpg_gender');
        if (tpgGender && gender) tpgGender.value = gender;
        if (typeof tampilkanGrafik === 'function') {
            tampilkanGrafik();
        }
    }

    // Ekspor global
    window.parseDanHitung = parseDanHitung;
    window.clearParser = clearParser;
    window.onGenderChange = onGenderChange;
    window.parseGender = parseGenderRobust;
    window.__parser_internals = {
        parseFlexibleDate,
        parseAgeComponents,
        parseMeasurement,
        parseNama,
        parseGenderRobust,
        formatDateForInput
    };
})();
