// OFFICIAL PDF CHART CALIBRATION DATA
// Pixel coordinates at scale=2.0x (matching charting.js render)
// pixelBounds: yMin = bottom of chart (high pixel Y), yMax = top (low pixel Y)
window.OfficialChartsDB = {
    // CDC Charts (Verified Grid Bounds)
    "cdc_female_bmi": {
        "pdfUrl": "assets/pdfs/cdc_female_bmi.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35 },
        "pixelBounds": { "xMin": 213.2, "xMax": 996.0, "yMin": 1282.4, "yMax": 237.6 }
    },
    // CDC Stature Left Grid (Ages 2 to 11.5, i.e., 24 to 138 months)
    "cdc_female_stature_left": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 80, "yMax": 160 },
        "pixelBounds": { "xMin": 218.4, "xMax": 626.2, "yMin": 1116.4, "yMax": 470.7 }
    },
    // CDC Stature Right Grid (Ages 11.5 to 20, i.e., 138 to 240 months)
    "cdc_female_stature_right": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 190 },
        "pixelBounds": { "xMin": 626.2, "xMax": 991.2, "yMin": 927.9, "yMax": 780.8 }
    },
    "cdc_female_weight": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100 },
        "pixelBounds": { "xMin": 218.4, "xMax": 991.2, "yMin": 1396.4, "yMax": 671.1 }
    },
    "cdc_male_bmi": {
        "pdfUrl": "assets/pdfs/cdc_male_bmi.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35 },
        "pixelBounds": { "xMin": 213.2, "xMax": 996.0, "yMin": 1282.4, "yMax": 237.6 }
    },
    // CDC Stature Left Grid (Ages 2 to 11.5, i.e., 24 to 138 months)
    "cdc_male_stature_left": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 138, "yMin": 80, "yMax": 160 },
        "pixelBounds": { "xMin": 218.4, "xMax": 626.2, "yMin": 1116.4, "yMax": 470.7 }
    },
    // CDC Stature Right Grid (Ages 11.5 to 20, i.e., 138 to 240 months)
    "cdc_male_stature_right": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 138, "xMax": 240, "yMin": 150, "yMax": 190 },
        "pixelBounds": { "xMin": 626.2, "xMax": 991.2, "yMin": 927.9, "yMax": 780.8 }
    },
    "cdc_male_weight": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": { "xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100 },
        "pixelBounds": { "xMin": 218.4, "xMax": 991.2, "yMin": 1396.4, "yMax": 671.1 }
    },

    // WHO Charts (Landscape A4 - 100% Mathematically Verified Grid Bounds)
    "who_female_headcirc": {
        "pdfUrl": "assets/pdfs/who_female_lku.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 30.0, "yMax": 55.3 },
        "pixelBounds": { "xMin": 209.0, "xMax": 952.6, "yMin": 1368.8, "yMax": 97.4 }
    },
    "who_female_imtu": {
        "pdfUrl": "assets/pdfs/who_female_imtu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 957.9, "yMax": 275.4 }
    },
    "who_female_stature": {
        "pdfUrl": "assets/pdfs/who_female_tbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 957.9, "yMax": 229.8 }
    },
    "who_female_weight": {
        "pdfUrl": "assets/pdfs/who_female_bbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 977.6, "yMax": 255.7 }
    },
    "who_female_weight_length": {
        "pdfUrl": "assets/pdfs/who_female_bbpb.pdf",
        "mathBounds": { "xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24 },
        "pixelBounds": { "xMin": 213.5, "xMax": 1418.2, "yMin": 971.1, "yMax": 262.1 }
    },
    "who_male_headcirc": {
        "pdfUrl": "assets/pdfs/who_male_lku.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 30.0, "yMax": 55.3 },
        "pixelBounds": { "xMin": 209.0, "xMax": 953.6, "yMin": 1368.8, "yMax": 97.4 }
    },
    "who_male_imtu": {
        "pdfUrl": "assets/pdfs/who_male_imtu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 957.9, "yMax": 275.4 }
    },
    "who_male_stature": {
        "pdfUrl": "assets/pdfs/who_male_tbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 957.9, "yMax": 229.8 }
    },
    "who_male_weight": {
        "pdfUrl": "assets/pdfs/who_male_bbu.pdf",
        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30 },
        "pixelBounds": { "xMin": 195.5, "xMax": 1399.7, "yMin": 977.6, "yMax": 255.7 }
    },
    "who_male_weight_length": {
        "pdfUrl": "assets/pdfs/who_male_bbpb.pdf",
        "mathBounds": { "xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24 },
        "pixelBounds": { "xMin": 213.5, "xMax": 1418.2, "yMin": 971.1, "yMax": 262.1 }
    },
};

window.calculateOfficialPixelCoords = function (chartKey, xAxisValue, yAxisValue) {
    let resolvedKey = chartKey;

    // Split coordinate grids dynamically for CDC Stature based on Age in months (11.5 years = 138 months)
    // With fallback: if age>=138 but height < right grid's yMin, use left grid instead
    if (chartKey === 'cdc_female_stature') {
        if (xAxisValue < 138) {
            resolvedKey = 'cdc_female_stature_left';
        } else {
            const rightChart = window.OfficialChartsDB['cdc_female_stature_right'];
            resolvedKey = (yAxisValue < rightChart.mathBounds.yMin) ? 'cdc_female_stature_left' : 'cdc_female_stature_right';
        }
    } else if (chartKey === 'cdc_male_stature') {
        if (xAxisValue < 138) {
            resolvedKey = 'cdc_male_stature_left';
        } else {
            const rightChart = window.OfficialChartsDB['cdc_male_stature_right'];
            resolvedKey = (yAxisValue < rightChart.mathBounds.yMin) ? 'cdc_male_stature_left' : 'cdc_male_stature_right';
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