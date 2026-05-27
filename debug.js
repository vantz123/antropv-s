const fs = require('fs');
const vm = require('vm');

const growthData = fs.readFileSync('growth-data.js', 'utf8');
const clinicalCore = fs.readFileSync('clinical-core.js', 'utf8');
const context = vm.createContext({
    window: {},
    console: console,
    document: {
        getElementById: () => ({ value: 'auto_split' })
    }
});

vm.runInContext(growthData + '\n' + clinicalCore, context);

const summary = context.calculateSummaryAgesByMode('male', 10, 12.0, 62.0, 'auto_split');
console.log("Summary Ages:", summary);
