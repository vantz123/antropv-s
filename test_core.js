const fs = require('fs');
const vm = require('vm');

const domState = {};
const sandbox = { 
    window: {}, 
    document: { 
        getElementById: (id) => {
            if (!domState[id]) {
                domState[id] = { value: '', innerHTML: '', style: {} };
            }
            return domState[id];
        }
    }, 
    console: { log: () => {}, error: () => {} }, // suppress expected logs
    Math: Math, 
    Number: Number, 
    parseFloat: parseFloat,
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

let stats = { maxZ: -Infinity, minZ: Infinity, maxHA: -Infinity, maxWA: -Infinity };

for (let i = 0; i < 1000; i++) {
    const isMale = Math.random() > 0.5;
    const gender = isMale ? 'male' : 'female';
    const ageMonths = Math.random() * 240; 
    
    const medianHeight = 50 + (ageMonths * 0.5); 
    const medianWeight = 3 + (ageMonths * 0.2);
    
    // Create some extreme cases
    const tb = Math.random() > 0.95 ? (Math.random() * 200) : (medianHeight + (Math.random() * 20 - 10));
    const bb = Math.random() > 0.95 ? (Math.random() * 100) : (medianWeight + (Math.random() * 10 - 5));
    const lk = 35 + (ageMonths * 0.1);

    // Mock DOM inputs
    domState['gender'] = { value: gender };
    domState['umur_bulan'] = { value: ageMonths.toString() };
    domState['umur_koreksi'] = { value: ageMonths.toString() };
    domState['usia_gestasi'] = { value: '' };
    domState['prematur'] = { value: 'false' };
    domState['bbs'] = { value: bb.toString() };
    domState['tb'] = { value: tb.toString() };
    domState['posisi'] = { value: ageMonths < 24 ? 'L' : 'H' };
    domState['lk'] = { value: lk.toString() };
    domState['lila'] = { value: '15' };
    domState['nama'] = { value: 'Test' };

    try {
        sandbox.hitungSemua();
        const result = sandbox.window.hasilSementara;
        
        if (!result) continue;
        
        const checks = [result.tbu, result.bbu, result.bbtb, result.imtu, result.lku];
        checks.forEach(z => {
            if (Number.isFinite(z)) {
                stats.maxZ = Math.max(stats.maxZ, z);
                stats.minZ = Math.min(stats.minZ, z);
            }
        });

        if (Number.isFinite(result.haMonth)) stats.maxHA = Math.max(stats.maxHA, result.haMonth);
        if (Number.isFinite(result.waMonth)) stats.maxWA = Math.max(stats.maxWA, result.waMonth);
        
    } catch (e) {
    }
}

const realConsole = require('console');
const myConsole = new realConsole.Console(process.stdout, process.stderr);
myConsole.log(`Ran 1000 cases.`);
myConsole.log(`Stats:`, stats);
