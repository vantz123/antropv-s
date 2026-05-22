import json

# Base pixel bounds for all standard WHO landscape PDFs (scale 2.0)
who_px = {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156} # Adjusted slightly based on typical WHO margins

db = {
    # CDC
    "cdc_male_bmi": {
        "pdfUrl": "assets/pdfs/cdc_male_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 11, "yMax": 35},
        "pixelBounds": {"xMin": 196, "xMax": 1042, "yMin": 1357, "yMax": 161}
    },
    "cdc_female_bmi": {
        "pdfUrl": "assets/pdfs/cdc_female_bmi.pdf",
        "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 11, "yMax": 35},
        "pixelBounds": {"xMin": 196, "xMax": 1042, "yMin": 1357, "yMax": 161}
    },
    # WHO TB/U (Length/Height for Age)
    "who_male_stature": {
        "pdfUrl": "assets/pdfs/who_male_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    "who_female_stature": {
        "pdfUrl": "assets/pdfs/who_female_tbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 120},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    # WHO BB/U (Weight for Age)
    "who_male_weight": {
        "pdfUrl": "assets/pdfs/who_male_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 0, "yMax": 26},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    "who_female_weight": {
        "pdfUrl": "assets/pdfs/who_female_bbu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 0, "yMax": 26},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    # WHO IMT/U (BMI for Age)
    "who_male_bmi": {
        "pdfUrl": "assets/pdfs/who_male_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    "who_female_bmi": {
        "pdfUrl": "assets/pdfs/who_female_imtu.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    # WHO LK/U (Head Circumference for Age)
    "who_male_headcirc": {
        "pdfUrl": "assets/pdfs/who_male_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 56},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    "who_female_headcirc": {
        "pdfUrl": "assets/pdfs/who_female_lku.pdf",
        "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 56},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    # WHO BB/TB (Weight for Length)
    "who_male_weight_length": {
        "pdfUrl": "assets/pdfs/who_male_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 0, "yMax": 24},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    },
    "who_female_weight_length": {
        "pdfUrl": "assets/pdfs/who_female_bbpb.pdf",
        "mathBounds": {"xMin": 45, "xMax": 110, "yMin": 0, "yMax": 24},
        "pixelBounds": {"xMin": 154, "xMax": 1564, "yMin": 1058, "yMax": 156}
    }
}

js_content = "// OFFICIAL PDF CHART CALIBRATION DATA\n"
js_content += "window.OfficialChartsDB = " + json.dumps(db, indent=4) + ";\n\n"
js_content += """
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
"""

with open('../official-charts-calibration.js', 'w') as f:
    f.write(js_content)
    
print("Updated official-charts-calibration.js")
