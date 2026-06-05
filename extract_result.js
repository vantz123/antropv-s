const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const paths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  let executablePath = paths.find(p => fs.existsSync(p));

  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.goto('file:///D:/ai integration/antrobuild/chartnutritionpediatric/chartnutritionpediatric-master/dist/index.html', { waitUntil: 'networkidle2' });

  await page.$$eval('.nav-tab', tabs => {
    const tab = tabs.find(t => t.getAttribute('data-tab') === 'antropometri');
    if (tab) tab.click();
  });
  
  await new Promise(r => setTimeout(r, 500));

  const testData = `An. Budi /L/3 tahun 2 bulan\nBB: 14 kg\nPB: 95 cm\nLK: 50 cm\nLiLA: 15 cm`;
  await page.type('#parserInput', testData);
  
  await page.$$eval('button', buttons => {
    const btn = buttons.find(b => b.textContent.includes('Parse Data'));
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 1500));

  // Extract the results
  const resultText = await page.evaluate(() => {
    const el = document.getElementById('hasil-antropometri');
    return el ? el.innerText : 'Element not found';
  });

  console.log("--- RESULT TEXT ---");
  console.log(resultText);
  console.log("-------------------");

  await browser.close();
})();
