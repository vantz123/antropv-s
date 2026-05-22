// OFFICIAL PDF CHART CALIBRATION DATA
window.OfficialChartsDB = {
    "cdc_male_stature": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
        "pixelBounds": {"xMin": 212.66, "xMax": 979.32, "yMin": 833.62, "yMax": 227.80}
    },
    "cdc_male_weight": {
        "pdfUrl": "assets/pdfs/cdc_male_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
        "pixelBounds": {"xMin": 212.66, "xMax": 979.32, "yMin": 1396.42, "yMax": 671.06}
    },
    "cdc_female_stature": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
        "pixelBounds": {"xMin": 212.66, "xMax": 979.32, "yMin": 833.62, "yMax": 227.80}
    },
    "cdc_female_weight": {
        "pdfUrl": "assets/pdfs/cdc_female_stature.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
        "pixelBounds": {"xMin": 212.66, "xMax": 979.32, "yMin": 1396.42, "yMax": 671.06}
    },
    "cdc_male_bmi": {
        "pdfUrl": "assets/pdfs/cdc_male_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "pixelBounds": {"xMin": 158.14, "xMax": 1033.20, "yMin": 1282.42, "yMax": 235.24}
    },
    "cdc_female_bmi": {
        "pdfUrl": "assets/pdfs/cdc_female_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "pixelBounds": {"xMin": 158.14, "xMax": 1033.20, "yMin": 1282.42, "yMax": 235.24}
    },
    "who_male_stature": {
        "pdfUrl": "assets/pdfs/who_male_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_female_stature": {
        "pdfUrl": "assets/pdfs/who_female_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_male_weight": {
        "pdfUrl": "assets/pdfs/who_male_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 0, "yMax": 26},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_female_weight": {
        "pdfUrl": "assets/pdfs/who_female_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 0, "yMax": 26},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_male_imtu": {
        "pdfUrl": "assets/pdfs/who_male_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "pixelBounds": {"xMin": 242, 'xMax': 1431, "yMin": 1004, "yMax": 239}
    },
    "who_female_imtu": {
        "pdfUrl": "assets/pdfs/who_female_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_male_headcirc": {
        "pdfUrl": "assets/pdfs/who_male_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 56},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_female_headcirc": {
        "pdfUrl": "assets/pdfs/who_female_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 56},
        "pixelBounds": {"xMin": 242, "xMax": 1431, "yMin": 1004, "yMax": 239}
    },
    "who_male_weight_length": {
        "pdfUrl": "assets/pdfs/who_male_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
        "pixelBounds": {"xMin": 222, "xMax": 1431, "yMin": 997, "yMax": 240}
    },
    "who_female_weight_length": {
        "pdfUrl": "assets/pdfs/who_female_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
        "pixelBounds": {"xMin": 222, "xMax": 1431, "yMin": 997, "yMax": 240}
    }
};

window.calculateOfficialPixelCoords = function(chartKey, xAxisValue, yAxisValue) {
    const chart = window.OfficialChartsDB[chartKey];
    if (!chart) return null;

    const math = chart.mathBounds;
    const px = chart.pixelBounds;

    const clampedX = Math.max(math.xMin - 2, Math.min(math.xMax + 2, xAxisValue));
    const clampedY = Math.max(math.yMin - 1, Math.min(math.yMax + 1, yAxisValue));

    const xRatio = (clampedX - math.xMin) / (math.xMax - math.xMin);
    const pixelX = px.xMin + (xRatio * (px.xMax - px.xMin));

    const yRatio = (clampedY - math.yMin) / (math.yMax - math.yMin);
    const pixelY = px.yMin + (yRatio * (px.yMax - px.yMin));

    return { x: pixelX, y: pixelY };
};
