const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
    window: {},
    document: {
        getElementById: () => ({ value: '' }),
        createElement: () => ({}),
    },
    console: console,
    Math: Math,
    Number: Number,
    String: String,
    Object: Object,
    Array: Array
};

vm.createContext(sandbox);

const scripts = [
    'growth-data.js',
    'clinical-core.js',
    'official-charts-calibration.js'
];

scripts.forEach(script => {
    const scriptPath = path.join(__dirname, script);
    let scriptCode = fs.readFileSync(scriptPath, 'utf8');
    scriptCode = scriptCode.replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
    vm.runInContext(scriptCode, sandbox);
});

console.log("Starting Stress Test for 10,000 simulated patient profiles...");

const genders = ['male', 'female'];
let errors = [];
let validPlots = 0;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

for (let i = 0; i < 10000; i++) {
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const ageMonths = rand(0, 240); // 0 to 20 years
    const height = rand(40, 210); // 40cm to 210cm
    const weight = rand(2, 120); // 2kg to 120kg
    
    try {
        // 1. Test Clinical Math (HA/WA)
        if (ageMonths <= 60) { // WHO
            sandbox.calculateHAWhoStrict(height, gender);
            sandbox.calculateWAWhoStrict(weight, gender, ageMonths);
        } else { // CDC
            sandbox.calculateHACDC(height, gender);
            sandbox.calculateWACDC(weight, gender);
        }
        
        // 2. Test Pixel Coordinate Generation
        const dbKeys = Object.keys(sandbox.window.OfficialChartsDB);
        for (const key of dbKeys) {
            if (key.includes('left') || key.includes('right')) continue;
            
            let yVal = height;
            let xVal = ageMonths;
            if (key.includes('bmi') || key.includes('imtu')) yVal = rand(10, 35);
            else if (key.includes('weight') && !key.includes('length') && !key.includes('stature')) yVal = weight;
            else if (key.includes('headcirc')) yVal = rand(30, 60);
            
            if (key.includes('length') || key.includes('stature')) {
                // weight-for-length or weight-for-stature
                if (key.includes('weight')) {
                    xVal = height;
                    yVal = weight;
                }
            }
            
            const px = sandbox.window.calculateOfficialPixelCoords(key, xVal, yVal);
            if (px) {
                if (px.x < 0 || px.y < 0) {
                    errors.push(`Negative coordinate on ${key}: age=${ageMonths}, height=${height} -> x=${px.x}, y=${px.y}`);
                } else {
                    validPlots++;
                }
            }
        }
    } catch (e) {
        errors.push(`Exception on iteration ${i} (age=${ageMonths.toFixed(1)}, height=${height.toFixed(1)}): ${e.message}`);
    }
}

if (errors.length > 0) {
    console.error(`Stress Test Failed with ${errors.length} errors.`);
    // Print first 10 errors
    console.error(errors.slice(0, 10).join('\n'));
    process.exit(1);
} else {
    console.log(`Stress Test Passed! Evaluated ${validPlots} valid coordinates successfully with zero crashes.`);
}
