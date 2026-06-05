const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const cdcCharts = [
    {
        key: 'cdc_female_stature_left', file: 'cdc_female_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '80', yMaxTxt: '150', yMinV: 80, yMaxV: 150, alignTarget: '180' // x roughly 185
    },
    {
        key: 'cdc_female_stature_right', file: 'cdc_female_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '150', yMaxTxt: '180', yMinV: 150, yMaxV: 180, alignTarget: '990' // x roughly 997
    },
    {
        key: 'cdc_female_weight_left', file: 'cdc_female_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '10', yMaxTxt: '105', yMinV: 10, yMaxV: 105, alignTarget: '180'
    },
    {
        key: 'cdc_female_weight_right', file: 'cdc_female_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '30', yMaxTxt: '105', yMinV: 30, yMaxV: 105, alignTarget: '990'
    },
    {
        key: 'cdc_male_stature_left', file: 'cdc_male_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '85', yMaxTxt: '150', yMinV: 85, yMaxV: 150, alignTarget: '180'
    },
    {
        key: 'cdc_male_stature_right', file: 'cdc_male_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '150', yMaxTxt: '190', yMinV: 150, yMaxV: 190, alignTarget: '990'
    },
    {
        key: 'cdc_male_weight_left', file: 'cdc_male_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '10', yMaxTxt: '105', yMinV: 10, yMaxV: 105, alignTarget: '180'
    },
    {
        key: 'cdc_male_weight_right', file: 'cdc_male_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '30', yMaxTxt: '105', yMinV: 30, yMaxV: 105, alignTarget: '990'
    },
    {
        key: 'cdc_female_bmi', file: 'cdc_female_bmi.pdf',
        xMinTxt: '2', xMaxTxt: '20', xMinV: 24, xMaxV: 240, 
        yMinTxt: '12', yMaxTxt: '30', yMinV: 12, yMaxV: 30, alignTarget: '180'
    },
    {
        key: 'cdc_male_bmi', file: 'cdc_male_bmi.pdf',
        xMinTxt: '2', xMaxTxt: '20', xMinV: 24, xMaxV: 240, 
        yMinTxt: '12', yMaxTxt: '30', yMinV: 12, yMaxV: 30, alignTarget: '180'
    }
];

async function run() {
    for (const chart of cdcCharts) {
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
            
            // X-axis: Age text
            if ((y > 1450 && y < 1480) || (y > 440 && y < 470)) {
                if (text === chart.xMinTxt && xMinPx === null) xMinPx = x;
                if (text === chart.xMaxTxt && xMaxPx === null) xMaxPx = x;
            }
            
            // Y-axis:
            const targetX = parseInt(chart.alignTarget);
            if (x > targetX - 30 && x < targetX + 30) {
                if (text === chart.yMinTxt && yMinPx === null) {
                    yMinPx = y;
                }
                if (text === chart.yMaxTxt && yMaxPx === null) {
                    yMaxPx = y;
                }
            }
        }

        if (!xMinPx || !xMaxPx || !yMinPx || !yMaxPx) {
            console.log(`Failed to find bounds for ${chart.key}. xMin:${xMinPx} xMax:${xMaxPx} yMin:${yMinPx} yMax:${yMaxPx}`);
            continue;
        }

        const pxPerX = (xMaxPx - xMinPx) / (chart.xMaxV - chart.xMinV);
        let targetMathXMin = chart.key.includes('right') ? 138 : 24;
        let targetMathXMax = chart.key.includes('right') ? 240 : (chart.key.includes('bmi') ? 240 : 138);
        if (chart.key.includes('bmi')) targetMathXMin = 24;
        
        let finalXMin = xMinPx - (chart.xMinV - targetMathXMin) * pxPerX;
        let finalXMax = xMinPx + (targetMathXMax - chart.xMinV) * pxPerX;
        
        let finalYMin = yMinPx;
        let finalYMax = yMaxPx;
        
        console.log(`    "${chart.key}": {`);
        console.log(`        "pdfUrl": "assets/pdfs/${chart.file}",`);
        console.log(`        "mathBounds": { "xMin": ${targetMathXMin}, "xMax": ${targetMathXMax}, "yMin": ${chart.yMinV}, "yMax": ${chart.yMaxV} },`);
        console.log(`        "pixelBounds": { "xMin": ${finalXMin.toFixed(1)}, "xMax": ${finalXMax.toFixed(1)}, "yMin": ${finalYMin.toFixed(1)}, "yMax": ${finalYMax.toFixed(1)} }`);
        console.log(`    },`);
    }
}
run().catch(console.error);
