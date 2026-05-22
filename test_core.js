const fs = require('fs');
const vm = require('vm');

const sandbox = { 
    window: {}, 
    document: { getElementById: (id) => ({ value: '' }) }, 
    console: console, 
    Math: Math, 
    Number: Number, 
    isNaN: isNaN 
};
vm.createContext(sandbox);

const growthData = fs.readFileSync('growth-data.js', 'utf8');
const dbGizi = fs.readFileSync('database-gizi.js', 'utf8');
const clinicalCore = fs.readFileSync('clinical-core.js', 'utf8');

vm.runInContext(growthData, sandbox);
vm.runInContext(dbGizi, sandbox);
vm.runInContext(clinicalCore, sandbox);

let errors = [];
let anomalies = [];

for (let i = 0; i < 1000; i++) {
    const isMale = Math.random() > 0.5;
    const gender = isMale ? 'male' : 'female';
    const ageMonths = Math.random() * 240; // 0 to 20 years
    const isLying = ageMonths < 24 ? true : (ageMonths > 24 ? false : Math.random() > 0.5);
    
    // Generate somewhat realistic values
    const medianHeight = 50 + (ageMonths * 0.5); // rough estimate
    const medianWeight = 3 + (ageMonths * 0.2);
    
    const tb = medianHeight + (Math.random() * 20 - 10);
    const bb = medianWeight + (Math.random() * 10 - 5);
    const lk = 35 + (ageMonths * 0.1); // rough estimate

    try {
        const result = sandbox.hitungSemua(tb, bb, ageMonths, gender, lk, isLying);
        
        if (!result) {
            errors.push({ case: i, error: 'hitungSemua returned null/undefined' });
            continue;
        }
        
        const checks = [
            { name: 'tbu_z', val: result.tbu_z },
            { name: 'bbu_z', val: result.bbu_z },
            { name: 'bbpb_z', val: result.bbpb_z },
            { name: 'imtu_z', val: result.imtu_z },
        ];
        
        checks.forEach(check => {
            if (check.val !== null && check.val !== undefined) {
                if (Number.isNaN(check.val) || !Number.isFinite(check.val)) {
                    anomalies.push({ case: i, age: ageMonths, tb, bb, gender, metric: check.name, issue: 'NaN or Infinite Z-Score' });
                }
            }
        });

        // Check HA / WA calculation
        if (result.haMonth !== null && result.haMonth !== undefined) {
             if (Number.isNaN(result.haMonth) || !Number.isFinite(result.haMonth) || result.haMonth > 300) {
                 anomalies.push({ case: i, age: ageMonths, tb, bb, gender, metric: 'haMonth', issue: `Invalid HA: ${result.haMonth}` });
             }
        }
        
    } catch (e) {
        errors.push({ case: i, age: ageMonths, tb, bb, gender, error: e.message, stack: e.stack });
    }
}

console.log(`Ran 1000 cases.`);
console.log(`Errors: ${errors.length}`);
if (errors.length > 0) console.log(errors.slice(0, 5));
console.log(`Anomalies: ${anomalies.length}`);
if (anomalies.length > 0) console.log(anomalies.slice(0, 5));
