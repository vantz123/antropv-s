const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testHapi() {
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
    resources: 'usable'
  });

  await new Promise(resolve => setTimeout(resolve, 500));
  const win = dom.window;
  const doc = win.document;
  
  const tc = {name: 'Hapi', gender: 'female', umur: 127, bb: 28, tb: 135};
  doc.getElementById('gender').value = tc.gender;
  doc.getElementById('umur_tahun').value = Math.floor(tc.umur / 12);
  doc.getElementById('umur_bulan').value = tc.umur;
  doc.getElementById('bbs').value = tc.bb;
  doc.getElementById('tb').value = tc.tb;
  doc.getElementById('posisi').value = 'berdiri';
  doc.getElementById('calculation_mode').value = 'auto_split';
  
  win.hitungSemua();
  console.log('r =', win.hasilSementara);
}
testHapi();
