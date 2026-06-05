const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function checkPdf(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const opList = await page.getOperatorList();
    
    const opsCount = {};
    for (const fn of opList.fnArray) {
        // Just count operations
        const name = Object.keys(pdfjsLib.OPS).find(k => pdfjsLib.OPS[k] === fn);
        opsCount[name] = (opsCount[name] || 0) + 1;
    }
    console.log(`Operations in ${pdfPath}:`, opsCount);
}

async function run() {
    await checkPdf('assets/pdfs/who_male_bbu.pdf');
}

run().catch(console.error);
