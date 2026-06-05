const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// === CORE: Extract grid lines with full CTM tracking ===
async function extractGrid(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const opList = await page.getOperatorList();
    const lines = [];
    const OPS = pdfjsLib.OPS;
    let ctm = viewport.transform.slice();
    const ctmStack = [];
    function mul(m1, m2) {
        return [m1[0]*m2[0]+m1[2]*m2[1], m1[1]*m2[0]+m1[3]*m2[1],
            m1[0]*m2[2]+m1[2]*m2[3], m1[1]*m2[2]+m1[3]*m2[3],
            m1[0]*m2[4]+m1[2]*m2[5]+m1[4], m1[1]*m2[4]+m1[3]*m2[5]+m1[5]];
    }
    function pt(m, x, y) { return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; }
    for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i], args = opList.argsArray[i];
        if (fn === OPS.save) ctmStack.push(ctm.slice());
        else if (fn === OPS.restore && ctmStack.length) ctm = ctmStack.pop();
        else if (fn === OPS.transform) ctm = mul(ctm, args);
        else if (fn === OPS.constructPath) {
            const ops = args[0], pa = args[1];
            let ai = 0, cx = 0, cy = 0;
            for (let j = 0; j < ops.length; j++) {
                if (ops[j] === 13) { cx = pa[ai]; cy = pa[ai+1]; ai+=2; }
                else if (ops[j] === 14) {
                    const nx = pa[ai], ny = pa[ai+1];
                    const p1 = pt(ctm, cx, cy), p2 = pt(ctm, nx, ny);
                    lines.push({ px1: p1[0], py1: p1[1], px2: p2[0], py2: p2[1] });
                    cx = nx; cy = ny; ai += 2;
                } else if (ops[j] === 15) {
                    const x = pa[ai+4], y = pa[ai+5];
                    if (Math.abs(cx - x) < 0.01 || Math.abs(cy - y) < 0.01) {
                        const p1 = pt(ctm, cx, cy), p2 = pt(ctm, x, y);
                        lines.push({ px1: p1[0], py1: p1[1], px2: p2[0], py2: p2[1] });
                    }
                    cx = x; cy = y; ai += 6;
                } else if (ops[j] === 19) ai += 4;
            }
        }
    }
    const vLines = lines.filter(l => Math.abs(l.px1 - l.px2) < 1.0 && Math.abs(l.py1 - l.py2) > 50);
    const hLines = lines.filter(l => Math.abs(l.py1 - l.py2) < 1.0 && Math.abs(l.px1 - l.px2) > 50);
    const uniqueX = [], uniqueY = [];
    vLines.forEach(l => { const x = (l.px1+l.px2)/2; if (!uniqueX.some(u => Math.abs(u-x) < 1.0)) uniqueX.push(x); });
    hLines.forEach(l => { const y = (l.py1+l.py2)/2; if (!uniqueY.some(u => Math.abs(u-y) < 1.0)) uniqueY.push(y); });
    uniqueX.sort((a,b) => a-b);
    uniqueY.sort((a,b) => a-b);
    
    // Also extract text labels
    const textContent = await page.getTextContent();
    const texts = [];
    for (const item of textContent.items) {
        const t = pdfjsLib.Util.transform(viewport.transform, item.transform);
        texts.push({ str: item.str.trim(), x: t[4], y: t[5] });
    }
    
    return { uniqueX, uniqueY, viewport, texts };
}

// Strategy: Use text labels to identify which grid line corresponds to which value
// Then use two known grid lines to compute perfect pixel bounds

const charts = [
    { key: 'who_male_weight', file: 'who_male_bbu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 2, mathYMax: 28,
      xMonths: 60, yLabelLow: '2', yLabelHigh: '28' },
    { key: 'who_female_weight', file: 'who_female_bbu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 2, mathYMax: 30,
      xMonths: 60, yLabelLow: '2', yLabelHigh: '30' },
    { key: 'who_male_stature', file: 'who_male_tbu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 45, mathYMax: 120,
      xMonths: 60, yLabelLow: '50', yLabelHigh: '115' },
    { key: 'who_female_stature', file: 'who_female_tbu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 45, mathYMax: 120,
      xMonths: 60, yLabelLow: '50', yLabelHigh: '115' },
    { key: 'who_male_bmi', file: 'who_male_imtu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 10, mathYMax: 22,
      xMonths: 60, yLabelLow: '12', yLabelHigh: '20' },
    { key: 'who_female_bmi', file: 'who_female_imtu.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 10, mathYMax: 22,
      xMonths: 60, yLabelLow: '12', yLabelHigh: '20' },
    { key: 'who_male_weight_length', file: 'who_male_bbpb.pdf',
      mathXMin: 45, mathXMax: 110, mathYMin: 2, mathYMax: 24,
      xMonths: 65, yLabelLow: '4', yLabelHigh: '22' },
    { key: 'who_female_weight_length', file: 'who_female_bbpb.pdf',
      mathXMin: 45, mathXMax: 110, mathYMin: 2, mathYMax: 24,
      xMonths: 65, yLabelLow: '4', yLabelHigh: '22' },
    { key: 'who_male_headcirc', file: 'who_male_lku.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 32, mathYMax: 54,
      xMonths: 60, yLabelLow: '34', yLabelHigh: '52' },
    { key: 'who_female_headcirc', file: 'who_female_lku.pdf',
      mathXMin: 0, mathXMax: 60, mathYMin: 32, mathYMax: 52,
      xMonths: 60, yLabelLow: '34', yLabelHigh: '50' },
];

async function run() {
    for (const chart of charts) {
        const { uniqueX, uniqueY, viewport, texts } = await extractGrid(`assets/pdfs/${chart.file}`);
        
        // X axis: V0 = month 0, V[xMonths] = month xMax
        const xMinPx = uniqueX[0];
        const xMaxPx = uniqueX[chart.xMonths] || uniqueX[uniqueX.length - 2]; // -2 to skip outer border
        
        // Y axis: Find the Y grid line closest to the text labels for yLabelLow and yLabelHigh
        // Text labels on the left side (x < 250) are Y-axis labels
        const yTexts = texts.filter(t => t.x < 250 && !isNaN(Number(t.str)) && t.str.length <= 3);
        
        // Find the text for yLabelLow and yLabelHigh
        let yLowText = null, yHighText = null;
        for (const t of yTexts) {
            if (t.str === chart.yLabelLow && !yLowText) yLowText = t;
            if (t.str === chart.yLabelHigh && !yHighText) yHighText = t;
        }
        
        if (!yLowText || !yHighText) {
            console.log(`ERROR: Could not find Y labels for ${chart.key}: low=${chart.yLabelLow} high=${chart.yLabelHigh}`);
            console.log('Available Y texts:', yTexts.map(t => `${t.str}@${t.y.toFixed(1)}`).join(', '));
            continue;
        }
        
        // Now find the closest grid line to each label
        function closestGridY(labelY) {
            let best = uniqueY[0], bestDist = Math.abs(uniqueY[0] - labelY);
            for (const y of uniqueY) {
                const d = Math.abs(y - labelY);
                if (d < bestDist) { best = y; bestDist = d; }
            }
            return best;
        }
        
        const yLowGrid = closestGridY(yLowText.y);  // Grid line for yLabelLow value
        const yHighGrid = closestGridY(yHighText.y); // Grid line for yLabelHigh value
        
        const lowVal = Number(chart.yLabelLow);
        const highVal = Number(chart.yLabelHigh);
        
        // Calculate px per unit
        // In canvas: yHighGrid < yLowGrid (top has smaller Y)
        // In values: highVal > lowVal
        const pxPerUnit = (yLowGrid - yHighGrid) / (highVal - lowVal);
        
        // Now calculate pixel positions for mathYMin and mathYMax
        const yPixelForMathYMax = yHighGrid - (chart.mathYMax - highVal) * pxPerUnit;
        const yPixelForMathYMin = yHighGrid + (highVal - chart.mathYMin) * pxPerUnit;
        
        console.log(`"${chart.key}": {`);
        console.log(`    "pdfUrl": "assets/pdfs/${chart.file}",`);
        console.log(`    "mathBounds": { "xMin": ${chart.mathXMin}, "xMax": ${chart.mathXMax}, "yMin": ${chart.mathYMin}, "yMax": ${chart.mathYMax} },`);
        console.log(`    "pixelBounds": { "xMin": ${xMinPx.toFixed(2)}, "xMax": ${xMaxPx.toFixed(2)}, "yMin": ${yPixelForMathYMin.toFixed(2)}, "yMax": ${yPixelForMathYMax.toFixed(2)} }`);
        console.log(`},`);
        console.log(`  [DEBUG] yLow: text="${chart.yLabelLow}" textY=${yLowText.y.toFixed(2)} gridY=${yLowGrid.toFixed(2)} | yHigh: text="${chart.yLabelHigh}" textY=${yHighText.y.toFixed(2)} gridY=${yHighGrid.toFixed(2)} | pxPerUnit=${pxPerUnit.toFixed(4)}`);
        console.log('');
    }
}

run().catch(console.error);
