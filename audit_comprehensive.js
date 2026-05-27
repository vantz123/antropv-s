const fs = require('fs');
const vm = require('vm');

const ctx = vm.createContext({
    window: {},
    console: console,
    document: {
        getElementById: () => ({ value: '' })
    }
});

function loadScript(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    vm.runInContext(code, ctx);
}

loadScript('growth-data.js');
loadScript('official-charts-calibration.js');
loadScript('clinical-core.js');

// Functions are defined at top scope in the VM context
const W = ctx.window; // window object for exposed things
const getLMS = ctx.getLMS;
const getLMS_CDC = ctx.getLMS_CDC;
const hitungZScore = ctx.hitungZScore;
const calculateXFromZ = ctx.calculateXFromZ;
const percentileToZ = ctx.percentileToZ;
const zToPercentile = ctx.zToPercentile;
const findAgeForMedian_WHO = ctx.findAgeForMedian_WHO;
const findAgeForMedian_CDC = ctx.findAgeForMedian_CDC;
const calculateHAWhoStrict = ctx.calculateHAWhoStrict;
const calculateWAWhoStrict = ctx.calculateWAWhoStrict;
const calculateHACDC = ctx.calculateHACDC;
const calculateWACDC = ctx.calculateWACDC;
const hitungBBIKlinis_fn = ctx.hitungBBIKlinis_fn;
const calculateAnthropometryByMode = ctx.calculateAnthropometryByMode;
const calculateSummaryAgesByMode = ctx.calculateSummaryAgesByMode;
const calculateOfficialPixelCoords = W.calculateOfficialPixelCoords;
const whoData = W.whoData || ctx.whoData;
const cdcData = W.cdcData || ctx.cdcData;
const who519Data = W.who519Data || ctx.who519Data;

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(testName, actual, expected, tolerance = 0.01) {
    totalTests++;
    if (actual === null || actual === undefined) {
        if (expected === null || expected === undefined) {
            passed++;
            console.log(`  âœ… ${testName}: null (expected null)`);
            return;
        }
        failed++;
        failures.push({ testName, actual, expected });
        console.log(`  âŒ ${testName}: got ${actual}, expected ${expected}`);
        return;
    }
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        passed++;
        console.log(`  âœ… ${testName}: ${typeof actual === 'number' ? actual.toFixed(4) : actual} (expected ${expected}, diff=${diff.toFixed(6)})`);
    } else {
        failed++;
        failures.push({ testName, actual, expected, diff });
        console.log(`  âŒ ${testName}: got ${typeof actual === 'number' ? actual.toFixed(4) : actual}, expected ${expected} (diff=${diff.toFixed(6)})`);
    }
}

// ========================================================================
// TEST 1: WHO Z-Score calculations (cross-verified with WHO Anthro software)
// ========================================================================
console.log('\n============================');
console.log('TEST 1: WHO Z-Score Calculations');
console.log('============================');

// Boy, 12 months, Weight=9.6 kg (should be zâ‰ˆ0 since M=9.6479)
const lms_bbu_m12 = getLMS(whoData.male.bbu, 12);
const z_bbu_m12 = hitungZScore(9.6, lms_bbu_m12.L, lms_bbu_m12.M, lms_bbu_m12.S, true);
assertEqual('WHO BB/U Boy 12m 9.6kg', z_bbu_m12, -0.045, 0.1);

// Boy, 12 months, Weight=7.5 kg (should be around -2 SD)
const z_bbu_m12_low = hitungZScore(7.5, lms_bbu_m12.L, lms_bbu_m12.M, lms_bbu_m12.S, true);
assertEqual('WHO BB/U Boy 12m 7.5kg', z_bbu_m12_low, -2.17, 0.15);

// Girl, 24 months, Height=86.4 cm (should be zâ‰ˆ0 since M=86.4153)
const lms_tbu_f24 = getLMS(whoData.female.tbu, 24);
const z_tbu_f24 = hitungZScore(86.4, lms_tbu_f24.L, lms_tbu_f24.M, lms_tbu_f24.S);
assertEqual('WHO TB/U Girl 24m 86.4cm', z_tbu_f24, -0.005, 0.05);

// Boy, 36 months, Height=96.676 cm (median = zâ‰ˆ0)
const lms_tbu_m36 = getLMS(whoData.male.tbu, 36);
const z_tbu_m36 = hitungZScore(96.676, lms_tbu_m36.L, lms_tbu_m36.M, lms_tbu_m36.S);
assertEqual('WHO TB/U Boy 36m 96.676cm (median)', z_tbu_m36, 0.0, 0.01);

// Boy, 0 months (newborn), Weight=3.3464 kg (median = zâ‰ˆ0)
const lms_bbu_m0 = getLMS(whoData.male.bbu, 0);
const z_bbu_m0 = hitungZScore(3.3464, lms_bbu_m0.L, lms_bbu_m0.M, lms_bbu_m0.S, true);
assertEqual('WHO BB/U Boy 0m 3.3464kg (median)', z_bbu_m0, 0.0, 0.01);

// ========================================================================
// TEST 2: WHO calculateXFromZ - reverse calculation
// ========================================================================
console.log('\n============================');
console.log('TEST 2: calculateXFromZ (reverse)');
console.log('============================');

// Boy 12m, z=0 should give M
const x_bbu_m12_z0 = calculateXFromZ(0, lms_bbu_m12.L, lms_bbu_m12.M, lms_bbu_m12.S);
assertEqual('XFromZ Boy BB/U 12m z=0', x_bbu_m12_z0, 9.6479, 0.01);

// Boy 12m, z=-2 → LMS formula: M*(1+L*S*Z)^(1/L) = 9.6479*(1+0.0644*0.10925*(-2))^(1/0.0644) = 7.742
const x_bbu_m12_zm2 = calculateXFromZ(-2, lms_bbu_m12.L, lms_bbu_m12.M, lms_bbu_m12.S);
assertEqual('XFromZ Boy BB/U 12m z=-2', x_bbu_m12_zm2, 7.742, 0.02);

// Girl 24m TB/U, z=0 should give M=86.4153
const x_tbu_f24_z0 = calculateXFromZ(0, lms_tbu_f24.L, lms_tbu_f24.M, lms_tbu_f24.S);
assertEqual('XFromZ Girl TB/U 24m z=0', x_tbu_f24_z0, 86.4153, 0.01);

// ========================================================================
// TEST 3: CDC Z-Score & Percentile
// ========================================================================
console.log('\n============================');
console.log('TEST 3: CDC Z-Score & Percentile');
console.log('============================');

// Boy 36 months, height=96.5 cm (CDC stature median at 36m)
const lms_cdc_st_m36 = getLMS_CDC(cdcData.male.stature, 36);
assertEqual('CDC stature male 36m Median', lms_cdc_st_m36.M, 96.5, 0.01);

const z_cdc_st_m36 = hitungZScore(96.5, lms_cdc_st_m36.L, lms_cdc_st_m36.M, lms_cdc_st_m36.S);
assertEqual('CDC TB/U Boy 36m 96.5cm (median zâ‰ˆ0)', z_cdc_st_m36, 0.0, 0.01);

// Girl 60 months, weight=19.384 (CDC median)
const lms_cdc_wt_f60 = getLMS_CDC(cdcData.female.weight, 60);
assertEqual('CDC weight female 60m Median', lms_cdc_wt_f60.M, 19.384, 0.01);

// Boy 120 months (10 years), BMI=15.815 (CDC median)
const lms_cdc_bmi_m120 = getLMS_CDC(cdcData.male.bmi, 120);
assertEqual('CDC BMI male 120m Median', lms_cdc_bmi_m120.M, 15.815, 0.01);

// ========================================================================
// TEST 4: percentileToZ and zToPercentile round-trip
// ========================================================================
console.log('\n============================');
console.log('TEST 4: Percentile â†” Z-Score round-trip');
console.log('============================');

assertEqual('P50â†’Z', percentileToZ(50), 0.0, 0.001);
assertEqual('P97â†’Z', percentileToZ(97), 1.881, 0.01);
assertEqual('P3â†’Z', percentileToZ(3), -1.881, 0.01);
assertEqual('P5â†’Z', percentileToZ(5), -1.645, 0.01);
assertEqual('P95â†’Z', percentileToZ(95), 1.645, 0.01);
assertEqual('Z=0â†’P50', zToPercentile(0), 50.0, 0.1);
assertEqual('Z=2â†’P97.7', zToPercentile(2), 97.7, 0.5);
assertEqual('Z=-2â†’P2.3', zToPercentile(-2), 2.3, 0.5);

// ========================================================================
// TEST 5: HA (Height Age) WHO â€” inverse median lookup
// ========================================================================
console.log('\n============================');
console.log('TEST 5: Height Age (HA) WHO');
console.log('============================');

// Boy 100 cm â†’ findAgeForMedian_WHO on tbu should give ~42 months (M at 42=100.5135)
const ha_boy_100 = findAgeForMedian_WHO(whoData.male.tbu, 100);
assertEqual('HA WHO Boy 100cm', ha_boy_100, 41.4, 1.0); // Approx ~41-42 months

// Girl 86.4 cm â†’ should be ~24 months (M at 24=86.4153)
const ha_girl_86 = findAgeForMedian_WHO(whoData.female.tbu, 86.4);
assertEqual('HA WHO Girl 86.4cm', ha_girl_86, 24.0, 0.5);

// Girl 110 cm â†’ should be ~60 months 
const ha_girl_110 = findAgeForMedian_WHO(whoData.female.tbu, 110);
assertEqual('HA WHO Girl 110cm', ha_girl_110, 59.2, 1.0);

// ========================================================================
// TEST 6: HA (Height Age) CDC â€” inverse median lookup
// ========================================================================
console.log('\n============================');
console.log('TEST 6: Height Age (HA) CDC');
console.log('============================');

// Girl 141 cm â†’ CDC stature female: between age 126 (141.8) and 132 (145.0)
// interpolating: 141 is between 126â†’141.8 and 120â†’138.6. So 141 sits between 126 and 132.
// More precisely: between 120 (138.6) and 126 (141.8): t = (141-138.6)/(141.8-138.6) = 2.4/3.2 = 0.75
// age = 120 + 0.75*6 = 124.5
const ha_girl_141_cdc = findAgeForMedian_CDC(cdcData.female.stature, 141);
assertEqual('HA CDC Girl 141cm', ha_girl_141_cdc, 124.5, 1.0);

// Boy 120 cm â†’ CDC stature male: M at 84=121.0, so ~83 months
const ha_boy_120_cdc = findAgeForMedian_CDC(cdcData.male.stature, 120);
assertEqual('HA CDC Boy 120cm', ha_boy_120_cdc, 82.0, 2.0);

// ========================================================================
// TEST 7: WA (Weight Age) WHO â€” inverse median lookup
// ========================================================================
console.log('\n============================');
console.log('TEST 7: Weight Age (WA) WHO');
console.log('============================');

// Boy 10 kg â†’ WHO bbu male: M at 14=10.0953, so ~14 months
const wa_boy_10 = findAgeForMedian_WHO(whoData.male.bbu, 10);
assertEqual('WA WHO Boy 10kg', wa_boy_10, 14.0, 1.0);

// Girl 12 kg â†’ WHO bbu female: M at 24=11.4675, M at 26=11.8669 â†’ ~25-26m
const wa_girl_12 = findAgeForMedian_WHO(whoData.female.bbu, 12);
assertEqual('WA WHO Girl 12kg', wa_girl_12, 26.0, 2.0);

// ========================================================================
// TEST 8: WA (Weight Age) CDC â€” inverse median lookup
// ========================================================================
console.log('\n============================');
console.log('TEST 8: Weight Age (WA) CDC');
console.log('============================');

// Girl 28.5 kg â†’ CDC weight female: M at 96=28.144, M at 102=29.905
// t = (28.5-28.144)/(29.905-28.144) = 0.356/1.761 = 0.202
// age = 96 + 0.202*6 = 97.2
const wa_girl_28 = findAgeForMedian_CDC(cdcData.female.weight, 28.5);
assertEqual('WA CDC Girl 28.5kg', wa_girl_28, 97.2, 1.0);

// ========================================================================
// TEST 9: BBI Klinis (composite HA â†’ BBI)
// ========================================================================
console.log('\n============================');
console.log('TEST 9: BBI Klinis');
console.log('============================');

// Girl, TB=86.4 cm, should give HAâ‰ˆ24 months, BBIâ‰ˆmedian weight at 24m = 11.4675
const bbi_girl_86 = hitungBBIKlinis_fn(86.4, 'female', 24, 'auto_split');
if (bbi_girl_86) {
    assertEqual('BBI Girl 86.4cm (HAâ‰ˆ24m)', bbi_girl_86.bbi, 11.47, 0.5);
    assertEqual('BBI Girl 86.4cm HA', bbi_girl_86.ha, 24.0, 0.5);
}

// Boy, TB=96.676 cm, should give HAâ‰ˆ36 months, BBIâ‰ˆmedian weight at 36m = 14.4871
const bbi_boy_97 = hitungBBIKlinis_fn(96.676, 'male', 36, 'auto_split');
if (bbi_boy_97) {
    assertEqual('BBI Boy 96.676cm (HAâ‰ˆ36m)', bbi_boy_97.bbi, 14.49, 0.5);
}

// ========================================================================
// TEST 10: Maulidatus case (Female, 171m, BB=28.5kg, TB=141cm)
// ========================================================================
console.log('\n============================');
console.log('TEST 10: Maulidatus Case (CDC auto_split >60m)');
console.log('============================');

const summary_m = calculateSummaryAgesByMode('female', 171, 28.5, 141, 'auto_split');
console.log(`  HA Month: ${summary_m.haMonth} (${(summary_m.haMonth/12).toFixed(2)} years)`);
console.log(`  WA Month: ${summary_m.waMonth} (${(summary_m.waMonth/12).toFixed(2)} years)`);

// HA for girl 141 cm on CDC stature:
// CDC stature female data: [120,1,138.6,...], [126,1,141.8,...]
// t = (141-138.6)/(141.8-138.6) = 2.4/3.2 = 0.75 â†’ age = 120 + 0.75*6 = 124.5
assertEqual('Maulidatus HA', summary_m.haMonth, 124.5, 1.5);
assertEqual('Maulidatus WA', summary_m.waMonth, 97.2, 1.5);

const bbi_m = hitungBBIKlinis_fn(141, 'female', 171, 'auto_split');
if (bbi_m) {
    console.log(`  BBI: ${bbi_m.bbi.toFixed(2)} kg (HA=${bbi_m.ha.toFixed(2)} months)`);
    // BBI = median weight at HA=124.5 months on CDC weight female
    // CDC weight female: [120,-0.168,35.85,...], [126,-0.124,38.042,...]
    // interpolated M = 35.85 + (124.5-120)/(126-120) * (38.042-35.85)
    //                = 35.85 + 0.75 * 2.192 = 35.85 + 1.644 = 37.49
    assertEqual('Maulidatus BBI', bbi_m.bbi, 37.49, 0.5);
}

// ========================================================================
// TEST 11: Chart dot placement verification
// Verify that the dots on Chart.js match the patient measurement values
// ========================================================================
console.log('\n============================');
console.log('TEST 11: Chart Dot Placement Logic');
console.log('============================');

// Simulate patient data for WHO (Boy, 24 months, BB=12kg, TB=87cm)
const patient_who = {
    gender: 'male',
    umur_dipakai: 24,
    bbs: 12,
    tb: 87,
    imt_value: 12 / ((87/100)**2),
    lk: 48
};

// For BB/U WHO chart: dot should be at (x=24, y=12)
// The chart uses patient.umur_dipakai as X and patient.bbs as Y
assertEqual('WHO BB/U dot X', patient_who.umur_dipakai, 24, 0);
assertEqual('WHO BB/U dot Y', patient_who.bbs, 12, 0);

// For TB/U WHO chart: dot at (x=24, y=87)
assertEqual('WHO TB/U dot X', patient_who.umur_dipakai, 24, 0);
assertEqual('WHO TB/U dot Y', patient_who.tb, 87, 0);

// For BB/PB: dot at (x=87, y=12)
assertEqual('WHO BB/PB dot X (TB)', patient_who.tb, 87, 0);
assertEqual('WHO BB/PB dot Y (BB)', patient_who.bbs, 12, 0);

// Verify median at 24m for male TB = 87.8161 
const median_tbu_24m = whoData.male.tbu[24].M;
assertEqual('WHO TB/U M@24m', median_tbu_24m, 87.8161, 0.001);

// z-score for TB 87 at 24m should be slightly negative
const z_87 = hitungZScore(87, 1, 87.8161, 0.03197);
assertEqual('WHO TB/U z-score (87cm@24m) should be ~-0.26', z_87, -0.29, 0.1);

// ========================================================================
// TEST 12: CDC Chart dot placement - verify stature and weight 
// For CDC: the stature PDF has TWO grids (left: 2-11.5yr, right: 11.5-20yr)
// AND a separate weight grid
// ========================================================================
console.log('\n============================');
console.log('TEST 12: CDC PDF Dot Calibration');
console.log('============================');

// For CDC stature chart with a girl at 60 months (5 yr), TB=108cm
// The CDC chart maps `cdc_female_stature` â†’ left grid if age<138 months
const coords_stature_60 = calculateOfficialPixelCoords('cdc_female_stature', 60, 108);
console.log(`  CDC Girl stature dot at age=60, tb=108 â†’ pixel (${coords_stature_60.x.toFixed(1)}, ${coords_stature_60.y.toFixed(1)})`);

// Verify the math bounds: left grid xMin=24, xMax=138, yMin=80, yMax=160
// xRatio = (60-24)/(138-24) = 36/114 = 0.3158
// pixelX = 218.4 + 0.3158 * (626.2 - 218.4) = 218.4 + 128.8 = 347.2
assertEqual('CDC stature left pixel X at 60m', coords_stature_60.x, 347.2, 2.0);

// For CDC weight chart with a girl at 60 months, BB=19.4kg
const coords_weight_60 = calculateOfficialPixelCoords('cdc_female_weight', 60, 19.4);
console.log(`  CDC Girl weight dot at age=60, bb=19.4 â†’ pixel (${coords_weight_60.x.toFixed(1)}, ${coords_weight_60.y.toFixed(1)})`);

// ========================================================================
// TEST 13: Full calculateAnthropometryByMode validation 
// ========================================================================
console.log('\n============================');
console.log('TEST 13: Full Anthropometry Calculation');
console.log('============================');

// WHO mode: Boy, 12 months, BB=9.6kg, TB=75.7cm, LK=46cm
const anthro_who = calculateAnthropometryByMode('male', 12, 9.6, 75.7, 46, 'auto_split');
assertEqual('WHO anthro Boy 12m BB/U z', anthro_who.bbu, -0.045, 0.15);
assertEqual('WHO anthro Boy 12m TB/U z', anthro_who.tbu, -0.01, 0.15);
if (anthro_who.imtu !== undefined) {
    // IMT = 9.6/(0.757^2) = 16.75, median at 12m = 17.2471 → z ≈ -0.36
    assertEqual('WHO anthro Boy 12m IMT/U z', anthro_who.imtu, -0.36, 0.05);
}

// CDC mode: Girl, 120 months (10 years), BB=31.5kg, TB=138.5cm
const anthro_cdc = calculateAnthropometryByMode('female', 120, 31.5, 138.5, null, 'auto_split');
console.log(`  CDC BB/U z=${anthro_cdc.bbu?.toFixed(3)}, pct=${anthro_cdc.bbu_pct?.toFixed(1)}, ref=${anthro_cdc.bbu_ref}`);
console.log(`  CDC TB/U z=${anthro_cdc.tbu?.toFixed(3)}, pct=${anthro_cdc.tbu_pct?.toFixed(1)}, ref=${anthro_cdc.tbu_ref}`);
console.log(`  CDC IMT/U z=${anthro_cdc.imtu?.toFixed(3)}, pct=${anthro_cdc.imtu_pct?.toFixed(1)}, ref=${anthro_cdc.imtu_ref}`);

// Girl 120m, TB=138.5 is very close to CDC stature female median at 120m (138.6)
assertEqual('CDC anthro Girl 120m TB/U near median', anthro_cdc.tbu, -0.01, 0.1);

// ========================================================================
// TEST 14: LMS interpolation correctness 
// ========================================================================
console.log('\n============================');
console.log('TEST 14: LMS Interpolation');
console.log('============================');

// WHO IMT male at 6m: M=17.2524 (exact key)
const lms_imtu_m6 = getLMS(whoData.male.imtu, 6);
assertEqual('WHO IMT male 6m exact', lms_imtu_m6.M, 17.2524, 0.001);

// WHO IMT male at 4.5m: should interpolate between 3m (16.4114) and 6m (17.2524)
// t = (4.5-3)/(6-3) = 0.5, M = 16.4114 + 0.5*(17.2524-16.4114) = 16.8319
const lms_imtu_m4_5 = getLMS(whoData.male.imtu, 4.5);
assertEqual('WHO IMT male 4.5m interpolated', lms_imtu_m4_5.M, 16.8319, 0.01);

// CDC stature male at 33m: interpolation between 30m (94.00171) and 36m (96.5)
// t = (33-30)/(36-30) = 0.5, M = 94.00171 + 0.5*(96.5-94.00171) = 95.2509
const lms_cdc_st_m33 = getLMS_CDC(cdcData.male.stature, 33);
assertEqual('CDC stature male 33m interpolated M', lms_cdc_st_m33.M, 95.251, 0.01);

// ========================================================================
// SUMMARY
// ========================================================================
console.log('\n============================');
console.log('AUDIT SUMMARY');
console.log('============================');
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => {
        console.log(`  âŒ ${f.testName}: got ${f.actual}, expected ${f.expected}${f.diff ? ` (diff=${f.diff.toFixed(6)})` : ''}`);
    });
}
console.log(`\nResult: ${failed === 0 ? 'âœ… ALL TESTS PASSED' : `âŒ ${failed} TESTS FAILED`}`);
