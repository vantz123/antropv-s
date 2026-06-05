const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function findGridBox(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    
    let currentX = 0, currentY = 0;
    const lines = [];
    
    const mockContext = {
        canvas: { width: viewport.width, height: viewport.height },
        save: () => {}, restore: () => {},
        transform: (a,b,c,d,e,f) => {},
        setTransform: (a,b,c,d,e,f) => {},
        translate: (x,y) => {}, scale: (x,y) => {}, rotate: (a) => {},
        clearRect: () => {}, beginPath: () => {},
        moveTo: (x, y) => { currentX = x; currentY = y; },
        lineTo: (x, y) => { 
            lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
            currentX = x; currentY = y;
        },
        rect: (x, y, w, h) => {
            lines.push({ x1: x, y1: y, x2: x+w, y2: y });
            lines.push({ x1: x+w, y1: y, x2: x+w, y2: y+h });
            lines.push({ x1: x+w, y1: y+h, x2: x, y2: y+h });
            lines.push({ x1: x, y1: y+h, x2: x, y2: y });
        },
        bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => {
            if (Math.abs(currentX - x) < 0.1 || Math.abs(currentY - y) < 0.1) {
                lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
            }
            currentX = x; currentY = y;
        },
        quadraticCurveTo: (cpx, cpy, x, y) => {
            if (Math.abs(currentX - x) < 0.1 || Math.abs(currentY - y) < 0.1) {
                lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
            }
            currentX = x; currentY = y;
        },
        fill: () => {}, stroke: () => {}, clip: () => {},
        measureText: () => ({ width: 0 }),
        fillText: () => {}, strokeText: () => {}, closePath: () => {}
    };
    
    const proxyCtx = new Proxy(mockContext, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return () => {};
        }
    });

    try { await page.render({ canvasContext: proxyCtx, viewport }).promise; } catch(e) {}

    // We now have all lines in CANVAS PIXELS!
    const hLines = lines.filter(l => Math.abs(l.y1 - l.y2) < 2 && Math.abs(l.x1 - l.x2) > 50);
    const vLines = lines.filter(l => Math.abs(l.x1 - l.x2) < 2 && Math.abs(l.y1 - l.y2) > 50);
    
    hLines.sort((a, b) => a.y1 - b.y1);
    vLines.sort((a, b) => a.x1 - b.x1);
    
    if (hLines.length > 0 && vLines.length > 0) {
        const topY = hLines[0].y1;
        const bottomY = hLines[hLines.length - 1].y1;
        const leftX = vLines[0].x1;
        const rightX = vLines[vLines.length - 1].x1;
        
        console.log(`Grid Bounds for ${pdfPath}:`);
        console.log(`xMin: ${leftX.toFixed(2)}, xMax: ${rightX.toFixed(2)}, yMin: ${bottomY.toFixed(2)}, yMax: ${topY.toFixed(2)}`);
    } else {
        console.log(`Could not find grid lines for ${pdfPath}`);
        console.log("hLines:", hLines.length, "vLines:", vLines.length);
    }
}

async function run() {
    await findGridBox('assets/pdfs/who_male_bbu.pdf');
    await findGridBox('assets/pdfs/cdc_male_stature.pdf');
}
run().catch(console.error);
