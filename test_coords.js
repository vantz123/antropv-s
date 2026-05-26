const fs = require('fs');
const vm = require('vm');

// Load environment
const context = vm.createContext({
    window: {},
    console: console,
    document: {
        getElementById: () => ({ value: '' })
    }
});

function loadScript(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    vm.runInContext(code, context);
}

loadScript('growth-data.js');
loadScript('official-charts-calibration.js');
loadScript('clinical-core.js');

const patientData = {
    gender: 'male',
    umurKron: 24, // 24 months (2 years)
    bbs: 12.2, // exactly 50th percentile for WHO 24mo Male (which is ~12.2 kg)
    tb: 87.1, // exactly 50th percentile for WHO 24mo Male (which is ~87.1 cm)
    isPrematur: false
};

const cdcPatientData = {
    gender: 'male',
    umurKron: 84, // 7 years
    bbs: 22.9, // approx 50th percentile for CDC 7yo Male
    tb: 121.9, // approx 50th percentile for CDC 7yo Male
    isPrematur: false
};

console.log("=== TEST WHO 0-5 ===");
const whoSummary = context.calculateSummaryAgesByMode(patientData.gender, patientData.umurKron, patientData.bbs, patientData.tb, 'auto_split');
console.log("WHO WA Month:", whoSummary.waMonth);
console.log("WHO HA Month:", whoSummary.haMonth);
const whoBBI = context.hitungBBIKlinis_fn(patientData.tb, patientData.gender, patientData.umurKron, 'auto_split');
console.log("WHO BBI Info:", whoBBI);

console.log("\n=== TEST CDC > 5 ===");
const cdcSummary = context.calculateSummaryAgesByMode(cdcPatientData.gender, cdcPatientData.umurKron, cdcPatientData.bbs, cdcPatientData.tb, 'auto_split');
console.log("CDC WA Month:", cdcSummary.waMonth);
console.log("CDC HA Month:", cdcSummary.haMonth);
const cdcBBI = context.hitungBBIKlinis_fn(cdcPatientData.tb, cdcPatientData.gender, cdcPatientData.umurKron, 'auto_split');
console.log("CDC BBI Info:", cdcBBI);

console.log("\n=== TEST CALIBRATION COORDS ===");
console.log("WHO TBU (Male 24 mo, 87.1 cm):", context.window.calculateOfficialPixelCoords('who_male_stature', 24, 87.1));
console.log("CDC Stature (Male 84 mo, 121.9 cm):", context.window.calculateOfficialPixelCoords('cdc_male_stature', 84, 121.9));
console.log("CDC Weight (Male 84 mo, 22.9 kg):", context.window.calculateOfficialPixelCoords('cdc_male_weight', 84, 22.9));

