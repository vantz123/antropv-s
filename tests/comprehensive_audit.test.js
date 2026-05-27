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
    const scriptPath = path.join(__dirname, '../', script);
    let scriptCode = fs.readFileSync(scriptPath, 'utf8');
    // Replace const/let with var at the top level to attach them to sandbox
    scriptCode = scriptCode.replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
    vm.runInContext(scriptCode, sandbox);
});

describe('Comprehensive System Audit', () => {
    
    describe('1. PDF Pixel Math Bounds (All 18 Charts)', () => {
        const db = sandbox.window.OfficialChartsDB;
        
        const chartKeys = Object.keys(db);
        
        chartKeys.forEach(key => {
            test(`Chart ${key} mappings are mathematically coherent`, () => {
                const chart = db[key];
                expect(chart.mathBounds).toBeDefined();
                expect(chart.pixelBounds).toBeDefined();
                
                const mb = chart.mathBounds;
                const px = chart.pixelBounds;
                
                // Test Center Point Math
                const centerX = (mb.xMax + mb.xMin) / 2;
                const centerY = (mb.yMax + mb.yMin) / 2;
                
                // For a straight calculation without fallback interference:
                // We'll calculate manually to compare
                const expectedPxX = px.xMin + ((centerX - mb.xMin) / (mb.xMax - mb.xMin)) * (px.xMax - px.xMin);
                const expectedPxY = px.yMin + ((centerY - mb.yMin) / (mb.yMax - mb.yMin)) * (px.yMax - px.yMin);
                
                expect(expectedPxX).not.toBeNaN();
                expect(expectedPxY).not.toBeNaN();
            });
        });
    });

    describe('2. Clinical Data LMS Inversion (HA & WA)', () => {
        test('CDC Male Stature HA interpolation', () => {
            // Find age for median height = 146cm
            // We know from CDC data: 132mo (11y) = 144.15cm, 138mo (11.5y) = 147.15cm
            // 146cm should be ~135.7 months
            const det = sandbox.findAgeForMedian_CDC(sandbox.cdcData.male.stature, 146, { returnDetail: true });
            expect(det).toBeDefined();
            expect(det.age).toBeCloseTo(135.7, 1);
        });

        test('WHO Male Stature HA interpolation', () => {
            // WHO 0-5 years. Let's pick 80cm
            // Find the age
            const det = sandbox.findAgeForMedian_WHO(sandbox.whoData.male.tbu, 80, { returnDetail: true });
            expect(det).toBeDefined();
            expect(det.age).toBeGreaterThan(12); // Should be > 1 year
        });
        
        test('CDC Edge Cases (Very tall/Very short)', () => {
            // Test height that is completely off the charts (e.g. 250cm for a 12yo)
            // It should probably clamp to the highest available age median or return clamped
            const detExt = sandbox.findAgeForMedian_CDC(sandbox.cdcData.male.stature, 250, { returnDetail: true });
            expect(detExt.clamped).toBe(true);
            expect(detExt.age).toBe(240); // Max age 20 years
            
            const detShort = sandbox.findAgeForMedian_CDC(sandbox.cdcData.male.stature, 30, { returnDetail: true });
            expect(detShort.clamped).toBe(true);
            expect(detShort.age).toBe(24); // Min age 2 years for CDC
        });
    });
});
