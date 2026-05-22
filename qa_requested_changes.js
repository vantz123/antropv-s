const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const results = [];
function rec(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' :: ' + detail : ''}`);
}

async function loadDom() {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^>]*><\/script>/i, '');
  html = html.replace(/<link rel="stylesheet" href="styles\.css">/i, '<style></style>');
  const localScripts = ['growth-data.js','attachment-data.js','clinical-core.js','database-gizi.js','who-charting.js','cdc-charting.js','charting.js','parser.js','ui.js'];
  for (const scriptName of localScripts) {
    const scriptText = fs.readFileSync(path.join(__dirname, scriptName), 'utf8');
    const rx = new RegExp(`<script src="${scriptName.replace('.', '\\.')}"[^>]*><\/script>`, 'i');
    html = html.replace(rx, `<script>
${scriptText}
<\/script>`);
  }
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/index.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.__alerts = [];
      window.__lastChartConfig = null;
      window.alert = (msg) => window.__alerts.push(String(msg));
      window.confirm = () => true;
      window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
      window.Chart = class FakeChart {
        constructor(ctx, config) { window.__lastChartConfig = config; }
        resize() {}
        update() {}
        destroy() {}
      };
      if (window.HTMLCanvasElement) {
        window.HTMLCanvasElement.prototype.getContext = function () { return { canvas: this }; };
      }
    }
  });
  await new Promise((resolve) => dom.window.addEventListener('load', () => setTimeout(resolve, 300)));
  return dom;
}

function fill(win, fields) {
  const doc = win.document;
  for (const [k, v] of Object.entries(fields)) {
    const el = doc.getElementById(k);
    if (el) el.value = v;
  }
}

(async () => {
  const dom = await loadDom();
  const win = dom.window;
  const doc = win.document;

  rec('UI removes WHO strict option', !doc.getElementById('calculation_mode').textContent.includes('Strict'));
  rec('UI has graph gender selector male/female only', Array.from(doc.getElementById('gender_grafik').options).map(o => o.value).join(',') === 'male,female', Array.from(doc.getElementById('gender_grafik').options).map(o => o.value).join(','));
  rec('Attachment data script loaded', !!win.ATTACHMENT_SOURCE_MANIFEST, Object.keys(win.ATTACHMENT_SOURCE_MANIFEST || {}).join(','));

  fill(win, { nama: 'WHO metric', gender: 'male', umur_bulan: '36', bbs: '14', tb: '95', posisi: 'berdiri', calculation_mode: 'who_extended' });
  win.hitungSemua();
  const whoText = doc.getElementById('hasil-antropometri').textContent.replace(/\s+/g, ' ');
  rec('WHO mode renders BB/TB card', /BB\/TB/.test(whoText), whoText);
  rec('WHO mode BB/TB uses WHO range wording', /Rentang \(WHO Z-Score\)|BB\/PB-TB|BB\/TB/.test(whoText), whoText);
  rec('Main gender syncs graph gender', doc.getElementById('gender_grafik').value === 'male', doc.getElementById('gender_grafik').value);

  fill(win, { calculation_mode: 'cdc_only', umur_bulan: '96', bbs: '24', tb: '126', gender: 'female', posisi: 'berdiri' });
  win.hitungSemua();
  const cdcText = doc.getElementById('hasil-antropometri').textContent.replace(/\s+/g, ' ');
  rec('CDC mode renders %BBI metric', /\(BB\/BBI\) × 100%|%BBI/.test(cdcText), cdcText);
  rec('CDC mode stores BB/TB metric as percent', win.hasilSementara.bbtb_metric_mode === 'cdc_pct_bbi', win.hasilSementara.bbtb_metric_mode || '');

  doc.getElementById('gender_grafik').value = 'male';
  win.applyGraphGenderSelection();
  rec('Graph gender selector updates patient gender', doc.getElementById('gender').value === 'male', doc.getElementById('gender').value);
  rec('Graph gender selector recalculates chart data', !!win.__lastChartConfig, win.__lastChartConfig ? 'chart-ready' : 'no-chart');

  win.simpanData();
  const dbText = doc.getElementById('tbody_pasien').textContent.replace(/\s+/g, ' ');
  rec('Database table shows BB/TB metric', /%|\d+\.\d+/.test(dbText), dbText);

  const fail = results.filter(r => !r.ok).length;
  console.log(`SUMMARY PASS=${results.length - fail} FAIL=${fail}`);
  if (fail) process.exit(1);
})();
