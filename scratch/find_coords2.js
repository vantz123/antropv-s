const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractCoords() {
    const data = new Uint8Array(fs.readFileSync('assets/pdfs/cdc_female_stature.pdf'));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const textContent = await page.getTextContent();
    
    const out = [];
    for (const item of textContent.items) {
        const text = item.str.trim();
        if (text && /^[0-9]+(\.[0-9]+)?$/.test(text)) {
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const x = transform[4];
            const y = transform[5];
            out.push({text: Number(text), x, y});
        }
    }
    
    // Sort by X, then Y
    out.sort((a,b) => {
        if (Math.abs(a.x - b.x) < 5) return a.y - b.y;
        return a.x - b.x;
    });
    
    const groups = {};
    for (const item of out) {
        const roundedX = Math.round(item.x / 10) * 10;
        if (!groups[roundedX]) groups[roundedX] = [];
        groups[roundedX].push(item);
    }
    
    for (const [x, items] of Object.entries(groups)) {
        console.log(`\n--- X ≈ ${x} ---`);
        for (const item of items) {
            console.log(`Text: '${item.text}' | Canvas Y: ${item.y.toFixed(1)}`);
        }
    }
}
extractCoords().catch(console.error);
