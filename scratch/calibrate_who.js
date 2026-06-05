const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const charts = [
    { file: 'who_female_bbu.pdf', yMinTxt: '2', yMaxTxt: '30' },
    { file: 'who_female_tbu.pdf', yMinTxt: '45', yMaxTxt: '125' },
    { file: 'who_male_bbu.pdf', yMinTxt: '2', yMaxTxt: '28' },
    { file: 'who_male_tbu.pdf', yMinTxt: '45', yMaxTxt: '125' },
    { file: 'who_female_imtu.pdf', yMinTxt: '10', yMaxTxt: '22' },
    { file: 'who_male_imtu.pdf', yMinTxt: '10', yMaxTxt: '22' },
    { file: 'who_female_bbpb.pdf', yMinTxt: '2', yMaxTxt: '26' }, // actually yMax 45? 
    { file: 'who_male_bbpb.pdf', yMinTxt: '2', yMaxTxt: '26' },
];

async function calibrateWHO() {
    for (const chart of charts) {
        const data = new Uint8Array(fs.readFileSync(`assets/pdfs/${chart.file}`));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const textContent = await page.getTextContent();
        
        let yMinPx = null;
        let yMaxPx = null;
        for (const item of textContent.items) {
            const text = item.str.trim();
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const y = transform[5];
            const x = transform[4];
            // Y-axis labels are typically on the left side, X < 250
            if (x < 250) {
                if (text === chart.yMinTxt && yMinPx === null) yMinPx = y;
                if (text === chart.yMaxTxt && yMaxPx === null) yMaxPx = y;
            }
        }
        
        console.log(`${chart.file}: yMinTxt(${chart.yMinTxt}) -> Y=${yMinPx ? yMinPx.toFixed(1) : 'null'}, yMaxTxt(${chart.yMaxTxt}) -> Y=${yMaxPx ? yMaxPx.toFixed(1) : 'null'}`);
    }
}
calibrateWHO().catch(console.error);
