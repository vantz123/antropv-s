const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Extract grid lines by tracking full CTM (current transform matrix)
async function extractGridWithCTM(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const opList = await page.getOperatorList();
    
    const lines = [];
    const OPS = pdfjsLib.OPS;
    
    // Track CTM stack
    let ctm = viewport.transform.slice(); // start with viewport transform
    const ctmStack = [];
    
    // Matrix multiply: [a1,b1,c1,d1,e1,f1] * [a2,b2,c2,d2,e2,f2]
    function multiplyMatrix(m1, m2) {
        return [
            m1[0]*m2[0] + m1[2]*m2[1],
            m1[1]*m2[0] + m1[3]*m2[1],
            m1[0]*m2[2] + m1[2]*m2[3],
            m1[1]*m2[2] + m1[3]*m2[3],
            m1[0]*m2[4] + m1[2]*m2[5] + m1[4],
            m1[1]*m2[4] + m1[3]*m2[5] + m1[5]
        ];
    }
    
    function applyMatrix(m, x, y) {
        return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
    }
    
    for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i];
        
        if (fn === OPS.save) {
            ctmStack.push(ctm.slice());
        } else if (fn === OPS.restore) {
            if (ctmStack.length > 0) ctm = ctmStack.pop();
        } else if (fn === OPS.transform) {
            ctm = multiplyMatrix(ctm, args);
        } else if (fn === OPS.constructPath) {
            const ops = args[0];
            const pathArgs = args[1];
            
            let argIdx = 0;
            let curX = 0, curY = 0;
            
            for (let j = 0; j < ops.length; j++) {
                if (ops[j] === 13) { // moveTo
                    curX = pathArgs[argIdx]; curY = pathArgs[argIdx+1]; argIdx+=2;
                } else if (ops[j] === 14) { // lineTo
                    const nx = pathArgs[argIdx], ny = pathArgs[argIdx+1];
                    const p1 = applyMatrix(ctm, curX, curY);
                    const p2 = applyMatrix(ctm, nx, ny);
                    lines.push({ px1: p1[0], py1: p1[1], px2: p2[0], py2: p2[1] });
                    curX = nx; curY = ny; argIdx += 2;
                } else if (ops[j] === 15) { // curveTo
                    const x = pathArgs[argIdx+4], y = pathArgs[argIdx+5];
                    if (Math.abs(curX - x) < 0.01 || Math.abs(curY - y) < 0.01) {
                        const p1 = applyMatrix(ctm, curX, curY);
                        const p2 = applyMatrix(ctm, x, y);
                        lines.push({ px1: p1[0], py1: p1[1], px2: p2[0], py2: p2[1] });
                    }
                    curX = x; curY = y; argIdx += 6;
                } else if (ops[j] === 19) { argIdx += 4; }
                else if (ops[j] === 18) {} // closePath
            }
        }
    }
    
    // Filter long straight vertical lines (same X, |dY| > 50)
    const vLines = lines.filter(l => Math.abs(l.px1 - l.px2) < 1.0 && Math.abs(l.py1 - l.py2) > 50);
    // Filter long straight horizontal lines (same Y, |dX| > 50)
    const hLines = lines.filter(l => Math.abs(l.py1 - l.py2) < 1.0 && Math.abs(l.px1 - l.px2) > 50);
    
    // Find unique X positions
    const uniqueX = [];
    vLines.forEach(l => {
        const x = (l.px1 + l.px2) / 2;
        if (!uniqueX.some(ux => Math.abs(ux - x) < 1.0)) uniqueX.push(x);
    });
    uniqueX.sort((a, b) => a - b);
    
    // Find unique Y positions
    const uniqueY = [];
    hLines.forEach(l => {
        const y = (l.py1 + l.py2) / 2;
        if (!uniqueY.some(uy => Math.abs(uy - y) < 1.0)) uniqueY.push(y);
    });
    uniqueY.sort((a, b) => a - b);
    
    console.log(`\n=== ${pdfPath} (viewport: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}) ===`);
    console.log(`Vertical grid lines: ${uniqueX.length}`);
    if (uniqueX.length > 0) {
        console.log(`  First 5: ${uniqueX.slice(0, 5).map(x => x.toFixed(2)).join(', ')}`);
        console.log(`  Last 5:  ${uniqueX.slice(-5).map(x => x.toFixed(2)).join(', ')}`);
    }
    console.log(`Horizontal grid lines: ${uniqueY.length}`);
    if (uniqueY.length > 0) {
        console.log(`  First 5 (top): ${uniqueY.slice(0, 5).map(y => y.toFixed(2)).join(', ')}`);
        console.log(`  Last 5 (bottom): ${uniqueY.slice(-5).map(y => y.toFixed(2)).join(', ')}`);
    }
    
    if (uniqueX.length > 1 && uniqueY.length > 1) {
        // For WHO BBU: 62 vertical lines = 0 to 60 months + outer boundary
        // The FIRST vertical line is month 0 (Birth), last is typically the outer boundary
        // 60 month intervals + the outer boundary at V61
        console.log(`\nGrid bounding box (canvas pixels at scale 2.0):`);
        console.log(`  xMin = ${uniqueX[0].toFixed(2)}`);
        console.log(`  xMax = ${uniqueX[uniqueX.length-1].toFixed(2)}`);
        console.log(`  yTop (min canvas Y) = ${uniqueY[0].toFixed(2)}`);
        console.log(`  yBottom (max canvas Y) = ${uniqueY[uniqueY.length-1].toFixed(2)}`);
        
        // Check vertical spacing consistency
        if (uniqueX.length >= 3) {
            const spacing = uniqueX[1] - uniqueX[0];
            console.log(`  V-line spacing: ${spacing.toFixed(4)} px/month`);
        }
        // Check horizontal spacing
        if (uniqueY.length >= 3) {
            const spacingH = uniqueY[2] - uniqueY[1]; // skip first which might be boundary
            console.log(`  H-line spacing: ${spacingH.toFixed(4)} px/unit`);
        }
    }
    
    return { uniqueX, uniqueY };
}

async function run() {
    await extractGridWithCTM('assets/pdfs/who_male_bbu.pdf');
    await extractGridWithCTM('assets/pdfs/who_male_tbu.pdf');
    await extractGridWithCTM('assets/pdfs/who_male_imtu.pdf');
    await extractGridWithCTM('assets/pdfs/who_male_bbpb.pdf');
    await extractGridWithCTM('assets/pdfs/who_male_lku.pdf');
    await extractGridWithCTM('assets/pdfs/who_female_bbu.pdf');
    await extractGridWithCTM('assets/pdfs/who_female_tbu.pdf');
    await extractGridWithCTM('assets/pdfs/who_female_imtu.pdf');
    await extractGridWithCTM('assets/pdfs/who_female_bbpb.pdf');
    await extractGridWithCTM('assets/pdfs/who_female_lku.pdf');
}

run().catch(console.error);
