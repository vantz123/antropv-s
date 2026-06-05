const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('file:///D:/ai integration/antrobuild/chartnutritionpediatric/chartnutritionpediatric-master/dist/index.html', { waitUntil: 'networkidle2' });
  
  // Tab Antropometri first
  await page.$$eval('.nav-tab', tabs => {
    const tab = tabs.find(t => t.getAttribute('data-tab') === 'antropometri');
    if (tab) tab.click();
  });
  
  await page.type('#parserInput', 'An. Budi, 3 tahun 2 bulan, BB 14, PB 95');
  await page.click('button[onclick="parseDanHitung()"]');
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Now switch to Tab Grafik
  await page.$$eval('.nav-tab', tabs => {
    const tab = tabs.find(t => t.getAttribute('data-tab') === 'grafik');
    if (tab) tab.click();
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  // The charts are inside .chart-container
  const containers = await page.$$('.chart-container');
  if (containers.length > 0) {
      await containers[0].screenshot({ path: 'C:\\\\Users\\\\MSI\\\\.gemini\\\\antigravity-ide\\\\brain\\\\d4a902d3-4539-4fff-8acf-9e34e4bf34a9\\\\grafik_bbu_terbaru.png' });
      if (containers.length > 1) {
          await containers[1].screenshot({ path: 'C:\\\\Users\\\\MSI\\\\.gemini\\\\antigravity-ide\\\\brain\\\\d4a902d3-4539-4fff-8acf-9e34e4bf34a9\\\\grafik_tbu_terbaru.png' });
      }
      console.log('Chart screenshots saved');
  } else {
      console.log('No charts found');
  }

  await browser.close();
})();
