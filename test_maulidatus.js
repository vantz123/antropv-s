const fs = require('fs');
const vm = require('vm');

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

// Doctor's data:
// Female, 14 years 3 months = 171 months
// BB: 28.5 kg
// TB: 141 cm

console.log("=== TEST MAULIDATUS === ");
const summary = context.calculateSummaryAgesByMode('female', 171, 28.5, 141, 'auto_split');

console.log(`HA Month (System): ${summary.haMonth} (${summary.haMonth / 12} years) -> Expected: ~138 (11y6m)`);
console.log(`WA Month (System): ${summary.waMonth} (${summary.waMonth / 12} years) -> Expected: ~106 (8y10m)`);

const bbi = context.hitungBBIKlinis_fn(141, 'female', 171, 'auto_split');
console.log(`BBI (System): ${bbi.bbi} -> Expected: 35.5`);
