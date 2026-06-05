// OFFICIAL PDF CHART CALIBRATION DATA
// All pixel coordinates extracted from PDF vector grid lines at scale=2.0x
// pixelBounds: yMin = bottom of chart (high canvas Y), yMax = top (low canvas Y)
// X-axis: grid line V0 = value xMin, grid line V[N] = value xMax
// Y-axis: computed from two known grid lines matched to their value labels
window.OfficialChartsDB = {
    // =====================================================================
    // CDC Charts — cdc_male/female_stature.pdf contains BOTH stature + weight
    // Split into left (24-138mo) and right (138-240mo) grids
    // =====================================================================
    "cdc_female_bmi": {
        "pdfUrl": "assets/pdfs/cdc_female_bmi.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35 },
        "pixelBounds": { "xMin": 213.2, "xMax": 996.0, "yMin": 1282.4, "yMax": 237.6 }
    },
    "cdc_female_stature_left": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 80, "yMax": 150 },
        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1134.0, "yMax": 567.5 }
    },
    "cdc_female_stature_right": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 180 },
        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 567.5, "yMax": 325.0 }
    },
    "cdc_female_weight_left": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 10, "yMax": 105 },
        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1414.0, "yMax": 932.7 }
    },
    "cdc_female_weight_right": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 30, "yMax": 105 },
        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 1254.9, "yMax": 648.8 }
    },
    "cdc_male_bmi": {
        "pdfUrl": "assets/pdfs/cdc_male_bmi.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35 },
        "pixelBounds": { "xMin": 213.2, "xMax": 996.0, "yMin": 1282.4, "yMax": 237.6 }
    },
    "cdc_male_stature_left": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 85, "yMax": 150 },
        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1093.3, "yMax": 567.5 }
    },
    "cdc_male_stature_right": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 190 },
        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 567.5, "yMax": 245.4 }
    },
    "cdc_male_weight_left": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 10, "yMax": 105 },
        "pixelBounds": { "xMin": 212.7, "xMax": 612.3, "yMin": 1414.0, "yMax": 932.7 }
    },
    "cdc_male_weight_right": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 30, "yMax": 105 },
        "pixelBounds": { "xMin": 614.5, "xMax": 979.3, "yMin": 1254.9, "yMax": 648.8 }
    },

    // =====================================================================
    // WHO Charts — ALL coordinates from PDF vector grid lines (CTM-tracked)
    // X: V0 = month 0, V60 = month 60 (grid line positions)
    // Y: Two labeled grid lines used to compute px/unit, then extrapolated
    // =====================================================================
    "who_female_headcirc": {
        "pdfUrl": "assets/pdfs/who_female_lku.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 32, "yMax": 52 },
        "pixelBounds": { "xMin": 213.28, "xMax": 1333.96, "yMin": 908.23, "yMax": 314.68 }
    },
    "who_female_bmi": {
        "pdfUrl": "assets/pdfs/who_female_imtu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.75, "yMin": 967.88, "yMax": 285.38 }
    },
    "who_female_stature": {
        "pdfUrl": "assets/pdfs/who_female_tbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.74, "yMin": 976.91, "yMax": 293.88 }
    },
    "who_female_weight": {
        "pdfUrl": "assets/pdfs/who_female_bbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.74, "yMin": 987.63, "yMax": 265.68 }
    },
    "who_female_weight_length": {
        "pdfUrl": "assets/pdfs/who_female_bbpb.pdf",
        "mathBounds": { "xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.75, "yMin": 981.15, "yMax": 272.08 }
    },
    "who_male_headcirc": {
        "pdfUrl": "assets/pdfs/who_male_lku.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 32, "yMax": 54 },
        "pixelBounds": { "xMin": 213.28, "xMax": 1333.96, "yMin": 910.83, "yMax": 282.21 }
    },
    "who_male_bmi": {
        "pdfUrl": "assets/pdfs/who_male_imtu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.75, "yMin": 967.88, "yMax": 285.38 }
    },
    "who_male_stature": {
        "pdfUrl": "assets/pdfs/who_male_tbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.74, "yMin": 976.91, "yMax": 293.88 }
    },
    "who_male_weight": {
        "pdfUrl": "assets/pdfs/who_male_bbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 28 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.74, "yMin": 985.78, "yMax": 267.51 }
    },
    "who_male_weight_length": {
        "pdfUrl": "assets/pdfs/who_male_bbpb.pdf",
        "mathBounds": { "xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24 },
        "pixelBounds": { "xMin": 221.73, "xMax": 1430.75, "yMin": 981.15, "yMax": 272.08 }
    },
};

window.calculateOfficialPixelCoords = function (chartKey, xAxisValue, yAxisValue) {
    let resolvedKey = chartKey;

    // Split coordinate grids dynamically for CDC Stature based on Age in months (11.5 years = 138 months)
    // With fallback: if age>=138 but height < right grid's yMin, use left grid instead
    if (chartKey === 'cdc_female_stature' || chartKey === 'cdc_male_stature' || chartKey === 'cdc_female_weight' || chartKey === 'cdc_male_weight') {
        if (xAxisValue < 138) {
            resolvedKey = `${chartKey}_left`;
        } else {
            const rightChart = window.OfficialChartsDB[`${chartKey}_right`];
            resolvedKey = (yAxisValue < rightChart.mathBounds.yMin) ? `${chartKey}_left` : `${chartKey}_right`;
        }
    }

    const chart = window.OfficialChartsDB[resolvedKey];
    if (!chart) return null;

    const math = chart.mathBounds;
    const px = chart.pixelBounds;

    // Calculate position without clamping so we can plot points slightly outside bounds
    const xRatio = (xAxisValue - math.xMin) / (math.xMax - math.xMin);
    const pixelX = px.xMin + xRatio * (px.xMax - px.xMin);

    const yRatio = (yAxisValue - math.yMin) / (math.yMax - math.yMin);
    const pixelY = px.yMin + yRatio * (px.yMax - px.yMin);

    return { x: pixelX, y: pixelY };
};