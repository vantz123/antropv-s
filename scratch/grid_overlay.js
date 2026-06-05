const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function checkGrid(chartKey, label) {
    const edgePaths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    let executablePath = edgePaths.find(p => fs.existsSync(p));

    const browser = await puppeteer.launch({
        executablePath, headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3001/index.html', { waitUntil: 'load' });
    await page.waitForFunction('!!window.OfficialChartsDB');

    const dataURL = await page.evaluate(async (key) => {
        const config = window.OfficialChartsDB[key];
        if (!config) return "NOT FOUND: " + key;
        
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const pdf = await pdfjsLib.getDocument(config.pdfUrl).promise;
        const pdfPage = await pdf.getPage(1);
        const viewport = pdfPage.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        
        const pb = config.pixelBounds;
        const mb = config.mathBounds;
        const mapX = (val) => pb.xMin + ((val - mb.xMin) / (mb.xMax - mb.xMin)) * (pb.xMax - pb.xMin);
        const mapY = (val) => pb.yMin + ((val - mb.yMin) / (mb.yMax - mb.yMin)) * (pb.yMax - pb.yMin);
        
        // Draw vertical grid lines (every 1 unit on X)
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const xStep = (mb.xMax - mb.xMin) > 100 ? 6 : 1; // CDC has months 24-240, so step by 6
        for (let v = mb.xMin; v <= mb.xMax; v += xStep) {
            const x = mapX(v);
            ctx.moveTo(x, Math.min(pb.yMin, pb.yMax));
            ctx.lineTo(x, Math.max(pb.yMin, pb.yMax));
        }
        ctx.stroke();
        
        // Draw horizontal grid lines (every 1 or 5 units on Y depending on range)
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const yRange = mb.yMax - mb.yMin;
        const yStep = yRange > 50 ? 5 : (yRange > 20 ? 2 : 1);
        for (let v = mb.yMin; v <= mb.yMax; v += yStep) {
            const y = mapY(v);
            ctx.moveTo(Math.min(pb.xMin, pb.xMax), y);
            ctx.lineTo(Math.max(pb.xMin, pb.xMax), y);
        }
        ctx.stroke();
        
        // Draw bounding box
        ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            Math.min(pb.xMin, pb.xMax), Math.min(pb.yMin, pb.yMax),
            Math.abs(pb.xMax - pb.xMin), Math.abs(pb.yMax - pb.yMin)
        );
        
        return canvas.toDataURL('image/png');
    }, chartKey);
    
    await browser.close();
    
    if (dataURL.startsWith("NOT FOUND")) {
        console.log(dataURL);
        return;
    }
    
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
    const outFile = path.join(__dirname, `grid_overlay_${label}.png`);
    fs.writeFileSync(outFile, base64Data, 'base64');
    console.log(`Saved ${outFile}`);
}

async function run() {
    // ALL WHO charts
    console.log("=== WHO Charts ===");
    await checkGrid('who_male_weight', 'who_male_bbu');
    await checkGrid('who_male_stature', 'who_male_tbu');
    await checkGrid('who_male_bmi', 'who_male_imtu');
    await checkGrid('who_male_headcirc', 'who_male_lku');
    await checkGrid('who_male_weight_length', 'who_male_bbpb');
    await checkGrid('who_female_weight', 'who_female_bbu');
    await checkGrid('who_female_stature', 'who_female_tbu');
    await checkGrid('who_female_bmi', 'who_female_imtu');
    await checkGrid('who_female_headcirc', 'who_female_lku');
    await checkGrid('who_female_weight_length', 'who_female_bbpb');
    
    // ALL CDC charts
    console.log("=== CDC Charts ===");
    await checkGrid('cdc_male_stature_left', 'cdc_male_stature_left');
    await checkGrid('cdc_male_stature_right', 'cdc_male_stature_right');
    await checkGrid('cdc_male_weight_left', 'cdc_male_weight_left');
    await checkGrid('cdc_male_weight_right', 'cdc_male_weight_right');
    await checkGrid('cdc_male_bmi', 'cdc_male_bmi');
    await checkGrid('cdc_female_stature_left', 'cdc_female_stature_left');
    await checkGrid('cdc_female_stature_right', 'cdc_female_stature_right');
    await checkGrid('cdc_female_weight_left', 'cdc_female_weight_left');
    await checkGrid('cdc_female_weight_right', 'cdc_female_weight_right');
    await checkGrid('cdc_female_bmi', 'cdc_female_bmi');
    
    console.log("\nAll overlays generated!");
}
run().catch(console.error);
