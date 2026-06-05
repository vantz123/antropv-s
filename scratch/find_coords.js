const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractCoords() {
    const data = new Uint8Array(fs.readFileSync('assets/pdfs/cdc_female_stature.pdf'));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    // Scale 2.0 to match the app
    const viewport = page.getViewport({ scale: 2.0 });
    const textContent = await page.getTextContent();
    
    for (const item of textContent.items) {
        // Find text that represents our axis labels
        const text = item.str.trim();
        if (['80', '160', '150', '190', '10', '100', '2', '11.5', '20'].includes(text)) {
            // Apply the PDF transformation matrix
            // text item transform: [ scaleX, skewY, skewX, scaleY, tx, ty ]
            // ty is from the BOTTOM left in PDF coordinates. We need it from TOP left for HTML Canvas.
            // But we can just use the viewport transform to map it exactly as it appears on the canvas
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            // transform[4] is tx, transform[5] is ty
            const x = transform[4];
            const y = transform[5]; // Note: in Canvas, Y is from top to bottom
            
            console.log(`Text: '${text}' | Canvas X: ${x.toFixed(1)} | Canvas Y: ${y.toFixed(1)}`);
        }
    }
}
extractCoords().catch(console.error);
