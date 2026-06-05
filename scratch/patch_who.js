const fs = require('fs');

let content = fs.readFileSync('official-charts-calibration.js', 'utf8');

const replacements = {
    "who_female_weight": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30 },\n        "pixelBounds": { "xMin": 196.1, "xMax": 1398.0, "yMin": 992.6, "yMax": 270.7 }',
    "who_female_stature": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120 },\n        "pixelBounds": { "xMin": 195.9, "xMax": 1397.9, "yMin": 972.9, "yMax": 290.4 }',
    "who_male_weight": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 28 },\n        "pixelBounds": { "xMin": 196.1, "xMax": 1398.0, "yMin": 990.8, "yMax": 272.5 }',
    "who_male_stature": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120 },\n        "pixelBounds": { "xMin": 195.9, "xMax": 1397.9, "yMin": 972.9, "yMax": 290.4 }',
    "who_female_bmi": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },\n        "pixelBounds": { "xMin": 196.0, "xMax": 1398.1, "yMin": 972.9, "yMax": 290.4 }',
    "who_male_bmi": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },\n        "pixelBounds": { "xMin": 196.0, "xMax": 1398.1, "yMin": 972.9, "yMax": 290.4 }',
    "who_female_weight_length": '        "mathBounds": { "xMin": 45, "xMax": 120, "yMin": 2, "yMax": 24 },\n        "pixelBounds": { "xMin": 213.9, "xMax": 1603.5, "yMin": 986.2, "yMax": 277.1 }',
    "who_male_weight_length": '        "mathBounds": { "xMin": 45, "xMax": 120, "yMin": 2, "yMax": 24 },\n        "pixelBounds": { "xMin": 213.9, "xMax": 1603.5, "yMin": 986.2, "yMax": 277.1 }',
    "who_female_headcirc": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 32, "yMax": 52 },\n        "pixelBounds": { "xMin": 183.4, "xMax": 1293.8, "yMin": 901.3, "yMax": 307.8 }',
    "who_male_headcirc": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 32, "yMax": 54 },\n        "pixelBounds": { "xMin": 183.4, "xMax": 1293.8, "yMin": 904.2, "yMax": 275.8 }'
};

for (const [key, replacement] of Object.entries(replacements)) {
    // some keys might have spaces around braces
    const pattern = new RegExp(`("${key}":\\s*\\{\\s*"pdfUrl":\\s*"[^"]+",\\s*)"mathBounds":\\s*\\{[^}]+\\},\\s*"pixelBounds":\\s*\\{[^}]+\\}`);
    content = content.replace(pattern, `$1${replacement}`);
}

fs.writeFileSync('official-charts-calibration.js', content, 'utf8');
console.log("Updated WHO coordinates");
