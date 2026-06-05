const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const charts = [
    { key: 'who_female_weight', file: 'who_female_bbu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '2', yMaxTxt: '30', yMinV: 2, yMaxV: 30 },
    { key: 'who_female_stature', file: 'who_female_tbu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '45', yMaxTxt: '120', yMinV: 45, yMaxV: 120 },
    { key: 'who_male_weight', file: 'who_male_bbu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '2', yMaxTxt: '28', yMinV: 2, yMaxV: 28 },
    { key: 'who_male_stature', file: 'who_male_tbu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '45', yMaxTxt: '120', yMinV: 45, yMaxV: 120 },
    { key: 'who_female_bmi', file: 'who_female_imtu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '10', yMaxTxt: '22', yMinV: 10, yMaxV: 22 },
    { key: 'who_male_bmi', file: 'who_male_imtu.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '10', yMaxTxt: '22', yMinV: 10, yMaxV: 22 },
    { key: 'who_female_weight_length', file: 'who_female_bbpb.pdf', xMinTxt: '50', xMaxTxt: '110', xMinV: 50, xMaxV: 110, yMinTxt: '2', yMaxTxt: '24', yMinV: 2, yMaxV: 24 },
    { key: 'who_male_weight_length', file: 'who_male_bbpb.pdf', xMinTxt: '50', xMaxTxt: '110', xMinV: 50, xMaxV: 110, yMinTxt: '2', yMaxTxt: '24', yMinV: 2, yMaxV: 24 },
    { key: 'who_female_hc', file: 'who_female_lku.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '32', yMaxTxt: '52', yMinV: 32, yMaxV: 52 },
    { key: 'who_male_hc', file: 'who_male_lku.pdf', xMinTxt: '1 year', xMaxTxt: '4 years', xMinV: 12, xMaxV: 48, yMinTxt: '32', yMaxTxt: '54', yMinV: 32, yMaxV: 54 }
];

async function generateCalibration() {
    for (const chart of charts) {
        const data = new Uint8Array(fs.readFileSync(`assets/pdfs/${chart.file}`));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const textContent = await page.getTextContent();
        
        let yMinPx = null, yMaxPx = null;
        let xMinPx = null, xMaxPx = null;
        
        for (const item of textContent.items) {
            const text = item.str.trim();
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const x = transform[4];
            const y = transform[5];
            
            // Y-axis labels are typically on the left side (x < 250)
            if (x < 250) {
                if (text === chart.yMinTxt && yMinPx === null) yMinPx = y;
                if (text === chart.yMaxTxt && yMaxPx === null) yMaxPx = y;
            }
            // X-axis labels are typically near the bottom (Y > 900)
            if (y > 900) {
                if (text === chart.xMinTxt && xMinPx === null) xMinPx = x;
                if (text === chart.xMaxTxt && xMaxPx === null) xMaxPx = x;
            }
        }
        
        // Calculate 0 to 60 bounds based on the found texts
        let finalXMin = 0, finalXMax = 0, finalYMin = 0, finalYMax = 0;
        
        if (chart.key.includes('weight_length')) {
            // X is Length in cm (45 to 120 for WHO)
            const pxPerX = (xMaxPx - xMinPx) / (chart.xMaxV - chart.xMinV);
            finalXMin = xMinPx - (chart.xMinV - 45) * pxPerX;
            finalXMax = finalXMin + (120 - 45) * pxPerX;
            chart.outMathX = [45, 120];
        } else {
            // X is Age in months (0 to 60)
            const pxPerX = (xMaxPx - xMinPx) / (chart.xMaxV - chart.xMinV);
            finalXMin = xMinPx - (chart.xMinV - 0) * pxPerX;
            finalXMax = finalXMin + (60 - 0) * pxPerX;
            chart.outMathX = [0, 60];
        }
        
        // Y axis
        const pxPerY = (yMaxPx - yMinPx) / (chart.yMaxV - chart.yMinV);
        finalYMin = yMinPx; 
        finalYMax = yMaxPx;
        chart.outMathY = [chart.yMinV, chart.yMaxV];
        
        if (!yMinPx || !yMaxPx || !xMinPx || !xMaxPx) {
            console.log(`ERROR on ${chart.key}: missing limits (xMinPx:${xMinPx}, xMaxPx:${xMaxPx}, yMinPx:${yMinPx}, yMaxPx:${yMaxPx})`);
            continue;
        }

        console.log(`    "${chart.key}": {`);
        console.log(`        "pdfUrl": "assets/pdfs/${chart.file}",`);
        console.log(`        "mathBounds": { "xMin": ${chart.outMathX[0]}, "xMax": ${chart.outMathX[1]}, "yMin": ${chart.outMathY[0]}, "yMax": ${chart.outMathY[1]} },`);
        console.log(`        "pixelBounds": { "xMin": ${finalXMin.toFixed(1)}, "xMax": ${finalXMax.toFixed(1)}, "yMin": ${finalYMin.toFixed(1)}, "yMax": ${finalYMax.toFixed(1)} }`);
        console.log(`    },`);
    }
}
generateCalibration().catch(console.error);
