const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractCoords() {
    const data = new Uint8Array(fs.readFileSync('assets/pdfs/cdc_male_stature.pdf'));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const textContent = await page.getTextContent();
    
    for (const item of textContent.items) {
        const text = item.str.trim();
        if (['150', '190', '140', '200'].includes(text)) {
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const x = transform[4];
            const y = transform[5];
            console.log(`Male PDF Text: '${text}' | Canvas X: ${x.toFixed(1)} | Canvas Y: ${y.toFixed(1)}`);
        }
    }
}
extractCoords().catch(console.error);
