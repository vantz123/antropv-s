const fs = require('fs');
const path = require('path');

// Mock browser window object for the script
global.window = {};

// Load the script
const scriptPath = path.join(__dirname, '../official-charts-calibration.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');
eval(scriptCode);

const db = window.OfficialChartsDB;
const calcCoords = window.calculateOfficialPixelCoords;

describe('OfficialChartsDB Calibration', () => {
    test('Database is loaded properly', () => {
        expect(db).toBeDefined();
        expect(db['cdc_female_bmi']).toBeDefined();
        expect(db['who_male_stature']).toBeDefined();
    });

    describe('CDC Stature Fallback Logic', () => {
        test('Age < 138 months defaults to LEFT grid', () => {
            const result = calcCoords('cdc_female_stature', 100, 120);
            const leftChart = db['cdc_female_stature_left'];
            expect(result).toBeDefined();
            // Should be bounded by left chart pixel y limits
            expect(result.y).toBeLessThanOrEqual(leftChart.pixelBounds.yMin);
            expect(result.y).toBeGreaterThanOrEqual(leftChart.pixelBounds.yMax);
        });

        test('Age >= 138 months with tall height uses RIGHT grid', () => {
            const age = 144;
            const height = 160; // > yMin of right grid (150)
            const resultRight = calcCoords('cdc_male_stature', age, height);
            
            // Expected coordinate calculation based on right grid
            const px = db['cdc_male_stature_right'].pixelBounds;
            const math = db['cdc_male_stature_right'].mathBounds;
            
            const expectedYRatio = (height - math.yMin) / (math.yMax - math.yMin);
            const expectedY = px.yMin + expectedYRatio * (px.yMax - px.yMin);
            
            expect(resultRight.y).toBeCloseTo(expectedY, 1);
        });

        test('Age >= 138 months with short height (<150) falls back to LEFT grid', () => {
            const age = 144;
            const height = 146; // < yMin of right grid (150)
            const resultFallback = calcCoords('cdc_male_stature', age, height);
            
            // Expected coordinate calculation based on LEFT grid
            const pxLeft = db['cdc_male_stature_left'].pixelBounds;
            const mathLeft = db['cdc_male_stature_left'].mathBounds;
            
            const expectedYRatioLeft = (height - mathLeft.yMin) / (mathLeft.yMax - mathLeft.yMin);
            const expectedYLeft = pxLeft.yMin + expectedYRatioLeft * (pxLeft.yMax - pxLeft.yMin);
            
            expect(resultFallback.y).toBeCloseTo(expectedYLeft, 1);
        });
    });

    describe('WHO Charts Continuity', () => {
        test('WHO male stature plots correctly at age 0', () => {
            const result = calcCoords('who_male_stature', 0, 50);
            const px = db['who_male_stature'].pixelBounds;
            const math = db['who_male_stature'].mathBounds;
            
            const expectedXRatio = (0 - math.xMin) / (math.xMax - math.xMin);
            const expectedX = px.xMin + expectedXRatio * (px.xMax - px.xMin);
            
            expect(result.x).toBeCloseTo(expectedX, 1);
            expect(result.x).toBeCloseTo(195.5, 1); // From pixelBounds.xMin
        });
    });
});
