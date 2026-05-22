const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const results = [];
function rec(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${name}${detail ? ' :: ' + detail : ''}`);
}

async function loadDom() {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^>]*><\/script>/i, '');
  html = html.replace(/<link rel="stylesheet" href="styles\.css">/i, '<style></style>');
  const localScripts = ['growth-data.js','attachment-data.js','clinical-core.js','database-gizi.js','who-charting.js','cdc-charting.js','charting.js','parser.js','ui.js'];
  for (const scriptName of localScripts) {
    const scriptText = fs.readFileSync(path.join(__dirname, scriptName), 'utf8');
    const rx = new RegExp(`<script src="${scriptName.replace('.', '\\.') }"[^>]*><\\/script>`, 'i');
    html = html.replace(rx, `<script>\n${scriptText}\n<\/script>`);
  }
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/index.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.__alerts = [];
      window.alert = (msg) => window.__alerts.push(String(msg));
      window.confirm = () => true;
      window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
      window.Chart = class FakeChart {
        constructor() {}
        resize() {}
        update() {}
        destroy() {}
      };
      if (window.HTMLCanvasElement) {
        window.HTMLCanvasElement.prototype.getContext = function () {
          return { canvas: this };
        };
      }
    }
  });
  await new Promise((resolve) => dom.window.addEventListener('load', () => setTimeout(resolve, 300)));
  return dom;
}

function setCase(win, fields) {
  const doc = win.document;
  const ids = ['nama','gender','dob','tanggal_ukur','umur_bulan','umur_tahun','usia_gestasi','umur_koreksi','status_prematur','bbs','tb','posisi','lk','lila','bbl','tb_ayah','tb_ibu','calculation_mode','bbi_umur','bbi_tb','bbi_gender'];
  ids.forEach(id => { const el = doc.getElementById(id); if (el) el.value = ''; });
  for (const [k,v] of Object.entries(fields)) {
    const el = doc.getElementById(k);
    if (el) el.value = v;
  }
  if (doc.getElementById('calculation_mode') && !fields.calculation_mode) {
    doc.getElementById('calculation_mode').value = 'auto_split';
  }
  if (typeof win.syncCalculationModeUI === 'function') win.syncCalculationModeUI();
}

(async () => {
  const dom = await loadDom();
  const win = dom.window;
  const doc = win.document;

  // Auto Split <= 5 tahun => WHO
  setCase(win, { nama: 'Auto WHO', gender: 'male', umur_bulan: '48', bbs: '16', tb: '102', posisi: 'berdiri', calculation_mode: 'auto_split' });
  win.hitungSemua();
  rec('Auto split <=5y uses WHO for BB/U', win.hasilSementara.bbu_ref === 'WHO', `ref=${win.hasilSementara.bbu_ref}`);
  rec('Auto split <=5y uses WHO for TB/U', win.hasilSementara.tbu_ref === 'WHO', `ref=${win.hasilSementara.tbu_ref}`);
  rec('Auto split <=5y BBI uses WHO or Klinis IDAI', /WHO|Klinis/i.test(win.hasilSementara.bbi_ref || ''), `ref=${win.hasilSementara.bbi_ref}`);

  // Auto Split > 5 tahun => CDC
  setCase(win, { nama: 'Auto CDC', gender: 'female', umur_bulan: '96', bbs: '24', tb: '126', posisi: 'berdiri', calculation_mode: 'auto_split' });
  win.hitungSemua();
  rec('Auto split >5y uses CDC for BB/U', win.hasilSementara.bbu_ref === 'CDC', `ref=${win.hasilSementara.bbu_ref}`);
  rec('Auto split >5y uses CDC for TB/U', win.hasilSementara.tbu_ref === 'CDC', `ref=${win.hasilSementara.tbu_ref}`);
  rec('Auto split >5y BBI uses CDC or Klinis IDAI', /CDC|Klinis/i.test(win.hasilSementara.bbi_ref || ''), `ref=${win.hasilSementara.bbi_ref}`);

  // WHO Only => semua jalur WHO dan fallback BMI/U tetap aktif
  setCase(win, { nama: 'WHO Only', gender: 'male', umur_bulan: '132', bbs: '32', tb: '140', posisi: 'berdiri', calculation_mode: 'who_extended' });
  win.hitungSemua();
  rec('WHO only keeps WA on WHO when available', win.hasilSementara.waRef === 'WHO', `ref=${win.hasilSementara.waRef}`);
  rec('WHO only keeps HA on WHO', win.hasilSementara.haRef === 'WHO', `ref=${win.hasilSementara.haRef}`);
  rec('WHO only keeps BBI available', Number.isFinite(win.hasilSementara.bbi), `bbi=${win.hasilSementara.bbi}`);
  rec('WHO only note mentions fallback app when needed', /fallback app/i.test(win.hasilSementara.bbi_note || ''), win.hasilSementara.bbi_note || '');
  rec('Audit trail rendered in result', /Audit Trail/.test(doc.getElementById('hasil-antropometri').textContent), 'audit card present');
  rec('Audit trail shows basis usia', /Usia kronologis|Usia koreksi prematur/.test(doc.getElementById('hasil-antropometri').textContent), doc.getElementById('hasil-antropometri').textContent.replace(/\s+/g, ' ').slice(0, 220));

  doc.getElementById('calculation_mode').value = 'who_extended';
  win.syncCalculationModeUI();
  doc.getElementById('bbi_umur').value = '132';
  doc.getElementById('bbi_tb').value = '140';
  doc.getElementById('bbi_gender').value = 'male';
  win.hitungBBIKlinis();
  const whoOnlyBBIText = doc.getElementById('hasil-bbi').textContent.replace(/\s+/g, ' ');
  rec('WHO only BBI widget shows computed value', /BBI Klinis =/.test(whoOnlyBBIText) && !/tidak tersedia/i.test(whoOnlyBBIText), whoOnlyBBIText);
  rec('WHO only BBI widget does not alert/crash', win.__alerts.length === 0, JSON.stringify(win.__alerts));

  // CDC Only => semua jalur CDC
  setCase(win, { nama: 'CDC Only', gender: 'male', umur_bulan: '132', bbs: '32', tb: '140', posisi: 'berdiri', calculation_mode: 'cdc_only' });
  win.hitungSemua();
  rec('CDC only uses CDC for BB/U', win.hasilSementara.bbu_ref === 'CDC', `ref=${win.hasilSementara.bbu_ref}`);
  rec('CDC only uses CDC for TB/U', win.hasilSementara.tbu_ref === 'CDC', `ref=${win.hasilSementara.tbu_ref}`);
  rec('CDC only uses CDC for IMT/U', win.hasilSementara.imtu_ref === 'CDC', `ref=${win.hasilSementara.imtu_ref}`);
  rec('CDC only uses CDC for WA', win.hasilSementara.waRef === 'CDC', `ref=${win.hasilSementara.waRef}`);
  rec('CDC only uses CDC for HA', win.hasilSementara.haRef === 'CDC', `ref=${win.hasilSementara.haRef}`);
  rec('CDC only uses CDC for BBI', win.hasilSementara.bbi_ref === 'CDC', `ref=${win.hasilSementara.bbi_ref}`);
  rec('Mode label stored human-readably', /CDC Only/.test(win.hasilSementara.calculation_mode_label || ''), win.hasilSementara.calculation_mode_label || '');
  rec('CDC mode stores BB/TB metric as percent', win.hasilSementara.bbtb_metric_mode === 'cdc_pct_bbi', win.hasilSementara.bbtb_metric_mode || '');

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`SUMMARY PASS=${pass} FAIL=${fail}`);
  if (fail > 0) process.exit(1);
})();
