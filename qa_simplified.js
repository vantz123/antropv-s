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
    const rx = new RegExp(`<script src="${scriptName.replace('.', '\\.')}"[^>]*><\\/script>`, 'i');
    html = html.replace(rx, `<script>\n${scriptText}\n<\/script>`);
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
        constructor(ctx, config) {
          window.__lastChartConfig = config;
        }
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
  const ids = ['nama','gender','dob','tanggal_ukur','umur_bulan','umur_tahun','usia_gestasi','umur_koreksi','status_prematur','bbs','tb','posisi','lk','lila','bbl','tb_ayah','tb_ibu'];
  ids.forEach(id => { const el = doc.getElementById(id); if (el) el.value = ''; });
  for (const [k,v] of Object.entries(fields)) {
    const el = doc.getElementById(k);
    if (el) el.value = v;
  }
}

(async () => {
  const dom = await loadDom();
  const win = dom.window;
  const doc = win.document;

  // Case 1: WHO concise output
  setCase(win, { nama: 'WHO Case', gender: 'male', umur_bulan: '36', bbs: '14', tb: '95', posisi: 'berdiri', lila: '14' });
  win.hitungSemua();
  const whoText = doc.getElementById('hasil-antropometri').textContent.replace(/\s+/g, ' ');
  rec('WHO result has BB/U', /BB\/U/.test(whoText));
  rec('WHO result has TB/U', /TB\/U/.test(whoText));
  rec('WHO result has IMT/U', /IMT\/U/.test(whoText));
  rec('WHO result has LILA', /LILA/.test(whoText));
  rec('WHO result has Ringkasan', /Ringkasan/.test(whoText));
  rec('WHO result includes BB/TB metric row', /BB\/TB/.test(whoText));
  rec('WHO result removes LK/U detail row', !/LK\/U/.test(whoText));

  // RDA table auto-filled
  const rdaTableText = doc.getElementById('rda-adjustment-table').textContent.replace(/\s+/g, ' ');
  rec('RDA adjustment table shows BBI/WA/HA', /BBI/.test(rdaTableText) && /WA/.test(rdaTableText) && /HA/.test(rdaTableText), rdaTableText.slice(0, 180));
  rec('HA years autofilled', Number.parseFloat(doc.getElementById('rda_umur').value) > 0, `rda_umur=${doc.getElementById('rda_umur').value}`);

  // Factor boundaries
  const f1 = win.getHAFactorRow(60);
  rec('HA 60 months -> 4-6 yr', f1.label === '4-6 yr', JSON.stringify(f1));
  const f2 = win.getHAFactorRow(144);
  rec('HA 144 months -> 10-12 yr', f2.label === '10-12 yr', JSON.stringify(f2));
  const f3 = win.getHAFactorRow(180);
  rec('HA 180 months -> 12-18 yr', f3.label === '12-18 yr', JSON.stringify(f3));

  // Explicit RDA example for HA 4-6 yr
  win.hasilSementara = { ...win.hasilSementara, haMonth: 60, ha: '5 th', wa: '4 th 6 bln', bbi: 18, bbs: 17 };
  doc.getElementById('rda_bbi').value = '18';
  doc.getElementById('rda_bbs').value = '17';
  doc.getElementById('rda_umur').value = '5';
  win.hitungRDA();
  const rdaResult = doc.getElementById('hasil-rda').textContent.replace(/\s+/g, ' ');
  rec('RDA energy uses 90 × BBI for 4-6 yr', /1620/.test(rdaResult), rdaResult);
  rec('RDA protein uses 1 × BBI for 4-6 yr', /18\.0 g/.test(rdaResult) || /18 g/.test(rdaResult), rdaResult);
  rec('RDA fluid uses 90-110 × BB now for 4-6 yr', /1530-1870 ml/.test(rdaResult), rdaResult);

  // WHO chart simplified
  const whoChart = win.WHOChartModule.buildChart(win.hasilSementara, 'tbu', 'male');
  rec('WHO chart option count is 1', win.WHOChartModule.options.length === 1, `count=${win.WHOChartModule.options.length}`);
  rec('WHO chart dataset count is 8', whoChart.datasets.length === 8, `count=${whoChart.datasets.length}`);
  rec('WHO chart viewport <= 24 months', (whoChart.scales.x.max - whoChart.scales.x.min) <= 24, `range=${whoChart.scales.x.min}-${whoChart.scales.x.max}`);
  rec('WHO chart title simplified', /HA \/ TB-U/.test(whoChart.title), whoChart.title);

  // CDC chart simplified
  win.hasilSementara = { ...win.hasilSementara, gender: 'female', umur_dipakai: 96, tb: 128 };
  const cdcChart = win.CDCChartModule.buildChart(win.hasilSementara, 'stature', 'female');
  rec('CDC chart option count is 1', win.CDCChartModule.options.length === 1, `count=${win.CDCChartModule.options.length}`);
  rec('CDC chart dataset count is 6', cdcChart.datasets.length === 6, `count=${cdcChart.datasets.length}`);
  rec('CDC chart viewport <= 48 months', (cdcChart.scales.x.max - cdcChart.scales.x.min) <= 48, `range=${cdcChart.scales.x.min}-${cdcChart.scales.x.max}`);
  rec('CDC chart title simplified', /CDC Categories/.test(cdcChart.title), cdcChart.title);

  // Graph rendering smoke test in DOM
  doc.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  doc.getElementById('grafik').classList.add('active');
  doc.getElementById('ref_grafik').value = 'cdc';
  win.updateIndikatorGrafik();
  win.tampilkanGrafik();
  await new Promise(r => setTimeout(r, 50));
  rec('Chart config created', !!win.__lastChartConfig, win.__lastChartConfig ? win.__lastChartConfig.options.plugins.title.text : '');

  // TPG collapsed section exists
  const tpgSummary = [...doc.querySelectorAll('summary')].find(el => /TPG ringkas/.test(el.textContent));
  rec('TPG compact collapse exists', !!tpgSummary);

  // Parser smoke test
  doc.getElementById('parserInput').value = 'An. Nurnaliana /P/6 bulan 5 hari\nBB: 5 kg\nPB: 60 cm\nLiLA: 12 cm\nUsia Gestasi: 28 minggu';
  win.parseDanHitung();
  rec('Parser smoke fills female', doc.getElementById('gender').value === 'female', `gender=${doc.getElementById('gender').value}`);
  rec('Parser smoke keeps no alerts', win.__alerts.length === 0, JSON.stringify(win.__alerts));

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`SUMMARY PASS=${pass} FAIL=${fail}`);
  if (fail > 0) process.exit(1);
})();
