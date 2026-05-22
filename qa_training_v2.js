const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const TRAINING = JSON.parse(fs.readFileSync(path.join(__dirname, 'training_data.json'), 'utf8'));

const TOL_BBI = 1.5;
const TOL_HA_MO = 4;
const TOL_WA_MO = 4;
const TOL_BBTB_PCT = 8;

const RESULTS = [];
function rec(group, name, ok, detail = '') {
    RESULTS.push({ group, name, ok, detail });
    if (!ok || process.env.QA_VERBOSE) {
        console.log(`${ok ? '✓' : '✗'} [${group}] ${name}${detail ? '  ::  ' + detail : ''}`);
    }
}

function checkBBUClass(refClass, bbu, bbu_pct) {
    // Tolerance: clinician sering bulatkan ke band terdekat (±10 pctile dianggap match)
    const PCT_TOL = 10;
    if (refClass.startsWith('P') && !refClass.includes('<') && !refClass.includes('>')) {
        if (refClass.includes('-')) {
            const m = refClass.match(/P(\d+(?:\.\d+)?)-P(\d+(?:\.\d+)?)/);
            if (m && bbu_pct !== undefined && bbu_pct !== null) {
                return bbu_pct >= +m[1] - PCT_TOL && bbu_pct <= +m[2] + PCT_TOL;
            }
        } else {
            const m = refClass.match(/P(\d+(?:\.\d+)?)/);
            if (m && bbu_pct !== undefined && bbu_pct !== null) {
                return Math.abs(bbu_pct - +m[1]) <= PCT_TOL;
            }
        }
    }
    if (refClass.startsWith('<P')) {
        const m = refClass.match(/<P(\d+)/);
        if (m && bbu_pct !== undefined && bbu_pct !== null) return bbu_pct < +m[1] + PCT_TOL;
    }
    if (refClass === 'Z=0') return Math.abs(bbu) < 0.6;
    if (refClass === 'Z=-1') return Math.abs(bbu - (-1)) < 0.6;
    let m;
    if ((m = refClass.match(/^(-?\d)<Z<(-?\d)$/))) {
        const lo = +m[1], hi = +m[2];
        return bbu > lo - 0.5 && bbu < hi + 0.5;
    }
    if ((m = refClass.match(/^Z<(-?\d)$/))) return bbu < +m[1] + 0.5;
    return null;
}

(async () => {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^>]*><\/script>/i, '');
    html = html.replace(/<link rel="stylesheet" href="styles\.css">/i, '<style></style>');
    const localScripts = ['growth-data.js','attachment-data.js','clinical-core.js','database-gizi.js','who-charting.js','cdc-charting.js','charting.js','parser.js','ui.js'];
    for (const s of localScripts) {
        const txt = fs.readFileSync(path.join(__dirname, s), 'utf8');
        const rx = new RegExp(`<script src="${s.replace('.', '\\.')}"[^>]*><\\/script>`, 'i');
        html = html.replace(rx, `<script>\n${txt}\n<\/script>`);
    }
    const dom = new JSDOM(html, {
        url: 'http://127.0.0.1:8765/index.html',
        runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
        beforeParse(window) {
            window.alert = () => {}; window.confirm = () => true;
            window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
            window.Chart = class { constructor() {} resize() {} update() {} destroy() {} };
            if (window.HTMLCanvasElement) window.HTMLCanvasElement.prototype.getContext = function() { return { canvas: this }; };
            window.localStorage.clear();
        }
    });
    await new Promise(r => dom.window.addEventListener('load', () => setTimeout(r, 300)));
    const win = dom.window, doc = win.document;

    function compute(p) {
        const ids = ['nama','gender','dob','tanggal_ukur','umur_bulan','umur_tahun','usia_gestasi','umur_koreksi','bbs','tb','posisi','lk','lila','bbl'];
        ids.forEach(id => { const el = doc.getElementById(id); if (el) el.value = ''; });
        const setIf = (id, v) => { const el = doc.getElementById(id); if (el) el.value = v; };
        setIf('nama', p.name);
        setIf('gender', p.gender);
        setIf('umur_bulan', String(p.umur));
        setIf('bbs', String(p.bb));
        setIf('tb', String(p.tb));
        setIf('lila', String(p.lila));
        setIf('lk', String(p.lk));
        setIf('posisi', p.umur < 24 ? 'terlentang' : 'berdiri');
        // Pakai mode auto_split agar engine campuran (WHO ≤5y, CDC >5y) yang dipakai
        // sesuai dengan dataset legacy training_data.json.
        const cm = doc.getElementById('calculation_mode');
        if (cm) cm.value = 'auto_split';
        if (typeof win.syncCalculationModeUI === 'function') win.syncCalculationModeUI();
        win.hitungSemua();
        return win.hasilSementara;
    }

    let stats = { total: 0, pass: 0, fail: 0 };

    for (const tc of TRAINING) {
        const r = compute(tc);
        if (!r) continue;
        const exp = tc.expected;
        const tag = `${tc.name}/${tc.gender}/${tc.umur}mo`;

        if (Number.isFinite(exp.bbi) && Number.isFinite(r.bbi)) {
            const ok = Math.abs(r.bbi - exp.bbi) <= TOL_BBI;
            rec('BBI', tag, ok, `app=${r.bbi?.toFixed(2)} expect=${exp.bbi}`);
            if (ok) stats.pass++; else stats.fail++; stats.total++;
        }
        const expHa = exp.ha_y !== undefined ? exp.ha_y * 12 : (exp.ha_mo !== undefined ? exp.ha_mo : null);
        if (expHa !== null && Number.isFinite(r.haMonth)) {
            const ok = Math.abs(r.haMonth - expHa) <= TOL_HA_MO;
            rec('HA', tag, ok, `app=${r.haMonth?.toFixed(1)}mo expect=${expHa.toFixed(1)}mo`);
            if (ok) stats.pass++; else stats.fail++; stats.total++;
        }
        const expWa = exp.wa_y !== undefined ? exp.wa_y * 12 : (exp.wa_mo !== undefined ? exp.wa_mo : null);
        if (expWa !== null && Number.isFinite(r.waMonth)) {
            const ok = Math.abs(r.waMonth - expWa) <= TOL_WA_MO;
            rec('WA', tag, ok, `app=${r.waMonth?.toFixed(1)}mo expect=${expWa.toFixed(1)}mo`);
            if (ok) stats.pass++; else stats.fail++; stats.total++;
        }
        if (exp.bbu) {
            const ok = checkBBUClass(exp.bbu, r.bbu, r.bbu_pct);
            if (ok !== null) {
                rec('BBU', tag, ok, `app z=${r.bbu?.toFixed(2)} pct=${r.bbu_pct?.toFixed(1)} expect=${exp.bbu}`);
                if (ok) stats.pass++; else stats.fail++; stats.total++;
            }
        }
        if (exp.tbu) {
            const ok = checkBBUClass(exp.tbu, r.tbu, r.tbu_pct);
            if (ok !== null) {
                rec('TBU', tag, ok, `app z=${r.tbu?.toFixed(2)} pct=${r.tbu_pct?.toFixed(1)} expect=${exp.tbu}`);
                if (ok) stats.pass++; else stats.fail++; stats.total++;
            }
        }
        if (exp.bbtb !== undefined && r.bbtb !== undefined && r.bbtb !== null) {
            const m = exp.bbtb.match(/^(-?\d)<Z<(-?\d)$/);
            const m2 = exp.bbtb.match(/^Z=(-?\d)$/);
            const m3 = exp.bbtb.match(/^Z<(-?\d)$/);
            let ok = null;
            if (m) ok = r.bbtb > +m[1] - 0.3 && r.bbtb < +m[2] + 0.3;
            else if (m2) ok = Math.abs(r.bbtb - +m2[1]) < 0.5;
            else if (m3) ok = r.bbtb < +m3[1] + 0.3;
            if (ok !== null) {
                rec('BBTB', tag, ok, `app z=${r.bbtb.toFixed(2)} expect=${exp.bbtb}`);
                if (ok) stats.pass++; else stats.fail++; stats.total++;
            }
        }
        if (Number.isFinite(exp.bbtb_pct) && Number.isFinite(r.bbi) && Number.isFinite(r.bbs)) {
            const appPct = (r.bbs / r.bbi) * 100;
            const ok = Math.abs(appPct - exp.bbtb_pct) <= TOL_BBTB_PCT;
            rec('BBTB%', tag, ok, `app=${appPct.toFixed(1)}% expect=${exp.bbtb_pct}%`);
            if (ok) stats.pass++; else stats.fail++; stats.total++;
        }
    }

    console.log(`\n=== STATS ===\nTOTAL=${stats.total}  PASS=${stats.pass}  FAIL=${stats.fail}`);
    const byGroup = {};
    for (const r of RESULTS) {
        if (!byGroup[r.group]) byGroup[r.group] = { pass: 0, fail: 0 };
        if (r.ok) byGroup[r.group].pass++; else byGroup[r.group].fail++;
    }
    for (const [g, s] of Object.entries(byGroup)) {
        console.log(`  ${g}: ${s.pass}/${s.pass + s.fail}`);
    }
})();
