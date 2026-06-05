const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

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
    
    const textContent = await page.getTextContent();
    const texts = [];
    for (const item of textContent.items) {
        const t = pdfjsLib.Util.transform(viewport.transform, item.transform);
        texts.push({ str: item.str.trim(), x: t[4], y: t[5] });
    }
    
    return { uniqueX, uniqueY, viewport, texts };
}

async function run() {
    // Extract CDC chart grid info
    const cdcFiles = [
        'cdc_male_stature.pdf',
        'cdc_female_stature.pdf',
        'cdc_male_bmi.pdf',
        'cdc_female_bmi.pdf'
    ];
    
    for (const file of cdcFiles) {
        const { uniqueX, uniqueY, viewport, texts } = await extractGrid(`assets/pdfs/${file}`);
        
        console.log(`\n=== ${file} (viewport: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}) ===`);
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
        
        // Print key Y-axis text labels
        const yTexts = texts.filter(t => t.x < 130 && !isNaN(Number(t.str)) && t.str.length <= 3);
        console.log('Y-axis labels (left side):');
        yTexts.forEach(t => console.log(`  "${t.str}" @ y=${t.y.toFixed(2)}`));
        
        // Print key X-axis text labels near bottom
        const xTexts = texts.filter(t => t.y > 1300 && !isNaN(Number(t.str)));
        console.log('X-axis labels (bottom):');
        xTexts.slice(0, 20).forEach(t => console.log(`  "${t.str}" @ x=${t.x.toFixed(2)} y=${t.y.toFixed(2)}`));
    }
}

run().catch(console.error);
