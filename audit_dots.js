const fs = require('fs');
const vm = require('vm');
const ctx = vm.createContext({
    window: {},
    console: console,
    document: { getElementById: () => ({ value: '' }) }
});
function loadScript(f) { vm.runInContext(fs.readFileSync(f,'utf8'), ctx); }
loadScript('growth-data.js');
loadScript('official-charts-calibration.js');
loadScript('clinical-core.js');

const W = ctx.window;
const whoData = W.whoData;

// Check XFromZ z=-2 at Boy 12m BB/U
const lms = ctx.getLMS(whoData.male.bbu, 12);
console.log('LMS at 12m boy bbu:', JSON.stringify(lms));
const x_zm2 = ctx.calculateXFromZ(-2, lms.L, lms.M, lms.S);
console.log('X at z=-2:', x_zm2);
// WHO software value: The WHO calculator gives z=-2 at 12m → should be about 7.7 kg
// Let's verify: z = ((X/M)^L - 1)/(L*S) 
// With L=0.0644, M=9.6479, S=0.10925
// X = M*(1 + L*S*Z)^(1/L) = 9.6479*(1 + 0.0644*0.10925*(-2))^(1/0.0644)
// = 9.6479*(1 - 0.01407)^(15.528)
// = 9.6479*(0.98593)^(15.528)
// = 9.6479*0.80251 = 7.743
console.log('Manual calc: 9.6479*(1+0.0644*0.10925*(-2))^(1/0.0644) =', 9.6479*Math.pow(1+0.0644*0.10925*(-2), 1/0.0644));
// So 7.74 is correct, not 7.63. My test expectation was wrong.

// Check IMT for Boy 12m
const bb = 9.6, tb = 75.7;
const imt = bb / ((tb/100)**2);
console.log(`\nIMT for BB=${bb}kg, TB=${tb}cm: ${imt.toFixed(4)}`);
// IMT = 9.6/(0.757^2) = 9.6/0.573049 = 16.753
const lms_imtu = ctx.getLMS(whoData.male.imtu, 12);
console.log('LMS for WHO IMT male at 12m:', JSON.stringify(lms_imtu));
// M=17.2471 at 12m, so IMT=16.75 is below median
const z_imtu = ctx.hitungZScore(imt, lms_imtu.L, lms_imtu.M, lms_imtu.S, true);
console.log('Z-score IMT/U:', z_imtu.toFixed(4));
// z = ((16.753/17.2471)^(-0.2331) - 1)/(-0.2331*0.08121)
// This would give approximately -0.36 which is correct!
// My expected value of -0.05 was wrong. The kid's BMI IS below median.

// Now let's test the actual issues the user is complaining about:
// The DOT positions on the PDF charts for HA and WA

console.log('\n=== DOT POSITION ISSUES ===');
console.log('The user says the dots on the PDF charts are wrong.');
console.log('Let us check what values are used for dots on WHO and CDC charts.\n');

// For WHO chart:
// In who-charting.js, the dot is placed at:
//   patientX = age (umur_dipakai)
//   patientY = bbs (for bbu), tb (for tbu), imt_value (for imtu), etc.
// This is CORRECT - the dot represents the patient's measurement at their current age.

// For PDF charts (charting.js downloadChartBackground):
// The HA dot is placed at: 
//   drawDot(chartKey, patient.haMonth, patient.tb, 'HA', 'blue')
// The WA dot is placed at:
//   drawDot(weightKey, patient.waMonth, patient.bbs, 'WA', 'blue')
// This maps haMonth→x, tb→y for stature grid, and waMonth→x, bbs→y for weight grid.

// Let's verify a WHO case: Boy 24m, BB=12kg, TB=87cm
const ha_who = ctx.calculateHAWhoStrict(87, 'male');
console.log('WHO HA for boy TB=87cm:', ha_who);
// TB=87cm. WHO tbu male M at 24=87.8161. 
// This means HA should be slightly less than 24 months since 87 < 87.8161
// HA dot on TB/U chart: x=HA months, y=TB=87cm

const wa_who = ctx.calculateWAWhoStrict(12, 'male', 24);
console.log('WHO WA for boy BB=12kg:', wa_who);
// BB=12kg. WHO bbu male M at 24=12.1515
// WA should be slightly less than 24 months

// The DOT for the patient measurement should be at (24, 87) for TB/U
// The DOT for HA should be at (HA_months, 87) for TB/U
// The DOT for WA should be at (WA_months, 12) for BB/U

// Now let's check: do the haMonth and waMonth values in hasilSementara 
// correspond correctly to what gets drawn?

console.log('\n=== CDC CASE: Girl 171m, BB=28.5, TB=141 ===');
const summary = ctx.calculateSummaryAgesByMode('female', 171, 28.5, 141, 'auto_split');
console.log('HA:', summary.haMonth?.toFixed(2), 'months =', (summary.haMonth/12)?.toFixed(2), 'years');
console.log('WA:', summary.waMonth?.toFixed(2), 'months =', (summary.waMonth/12)?.toFixed(2), 'years');

const bbi = ctx.hitungBBIKlinis_fn(141, 'female', 171, 'auto_split');
console.log('BBI:', bbi?.bbi?.toFixed(2), 'kg');

// On the PDF chart:
// For CDC stature: the stature dot goes at (171, 141) = patient's real age and height
// The HA dot goes at (124.5, 141) - HA's age, same height
// For CDC weight: the weight dot goes at (171, 28.5) = patient's real age and weight  
// The WA dot goes at (97.2, 28.5) - WA's age, same weight
// The BBI dot goes at (HA=124.5, BBI=37.49) - HA's age, BBI weight

console.log('\n=== EXPECTED DOTS ON CDC STATURE CHART ===');
console.log(`Patient dot: x=${171} (age in months), y=${141} (height cm)`);
console.log(`HA dot: x=${summary.haMonth?.toFixed(1)} (HA months), y=${141} (height cm)`);
console.log('\n=== EXPECTED DOTS ON CDC WEIGHT CHART ===');
console.log(`Patient dot: x=${171} (age in months), y=${28.5} (weight kg)`);
console.log(`WA dot: x=${summary.waMonth?.toFixed(1)} (WA months), y=${28.5} (weight kg)`);
console.log(`BBI dot: x=${summary.haMonth?.toFixed(1)} (HA months), y=${bbi?.bbi?.toFixed(1)} (BBI kg)`);

// Verify the pixel positions on the PDF
const calcCoords = W.calculateOfficialPixelCoords;
console.log('\n=== PIXEL POSITIONS ON CDC PDF ===');

// Stature chart
const stature_patient = calcCoords('cdc_female_stature', 171, 141);
const stature_ha = calcCoords('cdc_female_stature', 124.5, 141);
console.log('Stature patient pixel:', stature_patient ? `(${stature_patient.x.toFixed(1)}, ${stature_patient.y.toFixed(1)})` : 'null');
console.log('Stature HA pixel:', stature_ha ? `(${stature_ha.x.toFixed(1)}, ${stature_ha.y.toFixed(1)})` : 'null');

// Weight chart
const weight_patient = calcCoords('cdc_female_weight', 171, 28.5);
const weight_wa = calcCoords('cdc_female_weight', 97.2, 28.5);
const weight_bbi = calcCoords('cdc_female_weight', 124.5, 37.49);
console.log('Weight patient pixel:', weight_patient ? `(${weight_patient.x.toFixed(1)}, ${weight_patient.y.toFixed(1)})` : 'null');
console.log('Weight WA pixel:', weight_wa ? `(${weight_wa.x.toFixed(1)}, ${weight_wa.y.toFixed(1)})` : 'null');
console.log('Weight BBI pixel:', weight_bbi ? `(${weight_bbi.x.toFixed(1)}, ${weight_bbi.y.toFixed(1)})` : 'null');

// Now let's check the CDC stature chart for the SPLIT grid issue
// For age 171 months (>138), it should use the RIGHT grid
// For age 124.5 months (<138), it should use the LEFT grid
console.log('\nGrid selection:');
console.log('Patient age 171 → should use RIGHT grid (138-240 months)');
console.log('HA age 124.5 → should use LEFT grid (24-138 months)');
console.log('RIGHT grid yMin=150, yMax=190 → y range for height');
console.log('LEFT grid yMin=80, yMax=160 → y range for height');

// PROBLEM FOUND: The stature chart has TWO different Y-axis scales!
// Left grid: yMin=80, yMax=160 (for ages 2-11.5 years)
// Right grid: yMin=150, yMax=190 (for ages 11.5-20 years)
// The HA dot at 124.5 months uses LEFT grid which has yMin=80 to yMax=160
// Height 141 is well within the LEFT grid range (80-160) ✓
// Patient dot at 171 months uses RIGHT grid which has yMin=150 to yMax=190
// Height 141 is BELOW the RIGHT grid range (150-190)!
// This means the patient dot might be drawn outside the visible chart area!
if (stature_patient) {
    console.log(`\n⚠️ Patient TB=141cm is plotted on RIGHT grid (150-190 range).`);
    console.log(`   141 < 150 → dot is BELOW the chart grid area!`);
    console.log(`   Pixel Y would be: ${stature_patient.y.toFixed(1)} (above yMin pixel of 927.9)`);
}

// Check WHO cases too
console.log('\n=== WHO CHART DOT CHECK ===');
// Boy 24m, BB=12, TB=87
console.log('WHO Boy 24m BB=12 TB=87:');
const who_stature_dot = calcCoords('who_male_stature', 24, 87);
const who_weight_dot = calcCoords('who_male_weight', 24, 12);
console.log('  Stature dot:', who_stature_dot ? `(${who_stature_dot.x.toFixed(1)}, ${who_stature_dot.y.toFixed(1)})` : 'null');
console.log('  Weight dot:', who_weight_dot ? `(${who_weight_dot.x.toFixed(1)}, ${who_weight_dot.y.toFixed(1)})` : 'null');

// WHO stature: mathBounds xMin=0, xMax=60, yMin=45, yMax=125
// x = 24/60 * (1399.7-195.5) + 195.5 = 0.4 * 1204.2 + 195.5 = 481.68 + 195.5 = 677.18
// y = (87-45)/(125-45) * (229.8-957.9) + 957.9 = 42/80 * (-728.1) + 957.9 = -382.25 + 957.9 = 575.65
console.log('  Manual stature check: x=677.2, y=575.6');
