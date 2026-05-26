// OFFICIAL PDF CHART CALIBRATION DATA
// Pixel coordinates at scale=2.0x (matching charting.js render)
// pixelBounds: yMin = bottom of chart (high pixel Y), yMax = top (low pixel Y)
window.OfficialChartsDB = {
    // CDC Charts (Verified)
    "cdc_female_bmi": {
        "pdfUrl": "assets/pdfs/cdc_female_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1383.8, "yMax": 155.8}
    },
    "cdc_female_stature": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1124.9, "yMax": 238.8}
    },
    "cdc_female_weight": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1407.4, "yMax": 683.4}
    },
    "cdc_male_bmi": {
        "pdfUrl": "assets/pdfs/cdc_male_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1383.8, "yMax": 155.8}
    },
    "cdc_male_stature": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1124.9, "yMax": 238.8}
    },
    "cdc_male_weight": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
        "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1407.4, "yMax": 683.4}
    },

    // WHO Charts (Extrapolated from Extracted Grid Lines)
    "who_female_headcirc": {
        "pdfUrl": "assets/pdfs/who_female_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30.0, "yMax": 55.3},
        "pixelBounds": {"xMin": 209.0, "xMax": 952.6, "yMin": 1368.8, "yMax": 97.4}
    },
    "who_female_imtu": {
        "pdfUrl": "assets/pdfs/who_female_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 8.1, "yMax": 22.8},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_female_stature": {
        "pdfUrl": "assets/pdfs/who_female_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 41.5, "yMax": 130.3},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_female_weight": {
        "pdfUrl": "assets/pdfs/who_female_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 0.5, "yMax": 32.8},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_female_weight_length": {
        "pdfUrl": "assets/pdfs/who_female_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 0.6, "yMax": 30.1},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_male_headcirc": {
        "pdfUrl": "assets/pdfs/who_male_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30.0, "yMax": 55.3},
        "pixelBounds": {"xMin": 209.0, "xMax": 953.6, "yMin": 1368.8, "yMax": 97.4}
    },
    "who_male_imtu": {
        "pdfUrl": "assets/pdfs/who_male_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 8.1, "yMax": 22.8},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_male_stature": {
        "pdfUrl": "assets/pdfs/who_male_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 41.5, "yMax": 130.3},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_male_weight": {
        "pdfUrl": "assets/pdfs/who_male_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": -1.2, "yMax": 30.9},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
    "who_male_weight_length": {
        "pdfUrl": "assets/pdfs/who_male_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 0.6, "yMax": 30.1},
        "pixelBounds": {"xMin": 113.2, "xMax": 1570.6, "yMin": 1094.0, "yMax": 118.8}
    },
};

window.calculateOfficialPixelCoords = function(chartKey, xAxisValue, yAxisValue) {
    const chart = window.OfficialChartsDB[chartKey];
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