const fs = require('fs');

let content = fs.readFileSync('official-charts-calibration.js', 'utf8');

const replacements = {
    "cdc_female_stature_left": '        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 80, "yMax": 150 },\n        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1134.0, "yMax": 567.5 }',
    "cdc_female_stature_right": '        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 180 },\n        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 567.5, "yMax": 325.0 }',
    "cdc_male_stature_left": '        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 85, "yMax": 150 },\n        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1093.3, "yMax": 567.5 }',
    "cdc_male_stature_right": '        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 190 },\n        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 567.5, "yMax": 245.4 }'
};

for (const [key, replacement] of Object.entries(replacements)) {
    const pattern = new RegExp(`("${key}":\\s*\\{\\s*"pdfUrl":\\s*"[^"]+",\\s*)"mathBounds":\\s*\\{[^}]+\\},\\s*"pixelBounds":\\s*\\{[^}]+\\}`);
    content = content.replace(pattern, `$1${replacement}`);
}

// Now replace cdc_female_weight and cdc_male_weight with the left/right split versions!
const weightFemalePattern = /"cdc_female_weight":\s*\{\s*"pdfUrl":\s*"assets\/pdfs\/cdc_female_stature\.pdf",\s*"mathBounds":\s*\{[^}]+\},\s*"pixelBounds":\s*\{[^}]+\}\s*\}/;
content = content.replace(weightFemalePattern, 
    `"cdc_female_weight_left": {\n        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",\n        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 10, "yMax": 105 },\n        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1414.0, "yMax": 932.7 }\n    },\n    "cdc_female_weight_right": {\n        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",\n        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 30, "yMax": 105 },\n        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 1254.9, "yMax": 648.8 }\n    }`);

const weightMalePattern = /"cdc_male_weight":\s*\{\s*"pdfUrl":\s*"assets\/pdfs\/cdc_male_stature\.pdf",\s*"mathBounds":\s*\{[^}]+\},\s*"pixelBounds":\s*\{[^}]+\}\s*\}/;
content = content.replace(weightMalePattern,
    `"cdc_male_weight_left": {\n        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",\n        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 10, "yMax": 105 },\n        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1414.0, "yMax": 932.7 }\n    },\n    "cdc_male_weight_right": {\n        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",\n        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 30, "yMax": 105 },\n        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 1254.9, "yMax": 648.8 }\n    }`);

fs.writeFileSync('official-charts-calibration.js', content, 'utf8');
console.log("Updated CDC coordinates");
