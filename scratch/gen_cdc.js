const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const cdcCharts = [
    {
        key: 'cdc_female_stature_left', file: 'cdc_female_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '80', yMaxTxt: '150', yMinV: 80, yMaxV: 150, leftAlign: true
    },
    {
        key: 'cdc_female_stature_right', file: 'cdc_female_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '150', yMaxTxt: '180', yMinV: 150, yMaxV: 180, leftAlign: false
    },
    {
        key: 'cdc_male_stature_left', file: 'cdc_male_stature.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '85', yMaxTxt: '150', yMinV: 85, yMaxV: 150, leftAlign: true
    },
    {
        key: 'cdc_male_stature_right', file: 'cdc_male_stature.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '150', yMaxTxt: '190', yMinV: 150, yMaxV: 190, leftAlign: false
    },
    {
        key: 'cdc_female_weight_left', file: 'cdc_female_bbu.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '10', yMaxTxt: '40', yMinV: 10, yMaxV: 40, leftAlign: true
    },
    {
        key: 'cdc_female_weight_right', file: 'cdc_female_bbu.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '40', yMaxTxt: '80', yMinV: 40, yMaxV: 80, leftAlign: false
    },
    {
        key: 'cdc_male_weight_left', file: 'cdc_male_bbu.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '10', yMaxTxt: '40', yMinV: 10, yMaxV: 40, leftAlign: true
    },
    {
        key: 'cdc_male_weight_right', file: 'cdc_male_bbu.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '40', yMaxTxt: '90', yMinV: 40, yMaxV: 90, leftAlign: false
    },
    {
        key: 'cdc_female_bmi_left', file: 'cdc_female_imtu.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '14', yMaxTxt: '22', yMinV: 14, yMaxV: 22, leftAlign: true
    },
    {
        key: 'cdc_female_bmi_right', file: 'cdc_female_imtu.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '18', yMaxTxt: '30', yMinV: 18, yMaxV: 30, leftAlign: false
    },
    {
        key: 'cdc_male_bmi_left', file: 'cdc_male_imtu.pdf',
        xMinTxt: '2', xMaxTxt: '11', xMinV: 24, xMaxV: 132, 
        yMinTxt: '14', yMaxTxt: '22', yMinV: 14, yMaxV: 22, leftAlign: true
    },
    {
        key: 'cdc_male_bmi_right', file: 'cdc_male_imtu.pdf',
        xMinTxt: '12', xMaxTxt: '20', xMinV: 144, xMaxV: 240, 
        yMinTxt: '18', yMaxTxt: '30', yMinV: 18, yMaxV: 30, leftAlign: false
    }
];

async function run() {
    let out = {};
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
            
            // X-axis: text usually near Y=1465 or Y=450
            if ((y > 1450 && y < 1480) || (y > 440 && y < 470)) {
                if (text === chart.xMinTxt && xMinPx === null) xMinPx = x;
                if (text === chart.xMaxTxt && xMaxPx === null) xMaxPx = x;
            }
            
            // Y-axis
            if (chart.leftAlign) {
                if (x < 300) {
                    if (text === chart.yMinTxt && yMinPx === null) yMinPx = y;
                    if (text === chart.yMaxTxt && yMaxPx === null) yMaxPx = y;
                }
            } else {
                if (x > 900) {
                    if (text === chart.yMinTxt && yMinPx === null) yMinPx = y;
                    if (text === chart.yMaxTxt && yMaxPx === null) yMaxPx = y;
                }
            }
        }

        if (!xMinPx || !xMaxPx || !yMinPx || !yMaxPx) {
            console.log(`Failed to find bounds for ${chart.key}. xMin:${xMinPx} xMax:${xMaxPx} yMin:${yMinPx} yMax:${yMaxPx}`);
            continue;
        }

        const pxPerX = (xMaxPx - xMinPx) / (chart.xMaxV - chart.xMinV);
        let targetMathXMin = chart.leftAlign ? 24 : 138;
        let targetMathXMax = chart.leftAlign ? 138 : 240;
        
        let finalXMin = xMinPx - (chart.xMinV - targetMathXMin) * pxPerX;
        let finalXMax = xMinPx + (targetMathXMax - chart.xMinV) * pxPerX;
        
        // For Y, target bounds are usually the same as the text bounds we found, except maybe IMTU right
        // Let's just use the found bounds as mathBounds
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
