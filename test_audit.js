const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^>]*><\/script>/i, '');
  html = html.replace(/<link rel="stylesheet" href="styles\.css">/i, '<style></style>');
  
  const localScripts = ['growth-data.js','attachment-data.js','clinical-math.js','clinical-logic.js','clinical-ui.js','database-gizi.js','who-charting.js','cdc-charting.js','official-charts-calibration.js','charting.js','parser.js','ui.js'];
  for (const scriptName of localScripts) {
    const scriptText = fs.readFileSync(path.join(__dirname, scriptName), 'utf8');
    const rx = new RegExp(`<script src="${scriptName.replace('.', '\\.')}(?:\\?[^"]*)?"[^>]*><\\/script>`, 'i');
    html = html.replace(rx, () => `<script>\n${scriptText}\n<\/script>`);
  }

  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/index.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });

  await new Promise(resolve => setTimeout(resolve, 500));
  const win = dom.window;
  const doc = win.document;
  
  try {
    win.hasilSementara = {};
    doc.getElementById('jenis_kelamin').value = 'male';
    doc.getElementById('usia_tahun').value = '11';
    doc.getElementById('usia_bulan').value = '0';
    doc.getElementById('calculation_mode').value = 'who_strict';
    win.hitungSemua();
    console.log(doc.getElementById('hasil-antropometri').textContent);
  } catch (err) {
    console.error(err);
  }
}
run();
