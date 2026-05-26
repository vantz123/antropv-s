"""
Final generation of the calibration data for official-charts-calibration.js
"""

import os

js_lines = [
    "// OFFICIAL PDF CHART CALIBRATION DATA",
    "// Pixel coordinates at scale=2.0x (matching charting.js render)",
    "// pixelBounds: yMin = bottom of chart (high pixel Y), yMax = top (low pixel Y)",
    "window.OfficialChartsDB = {"
]

charts = {
    "who_male_stature": {"pdf": "who_male_tbu.pdf", "math": [0,60,45,125], "px": [113.4,1570.4,1094.0,157.0]},
    "who_female_stature": {"pdf": "who_female_tbu.pdf", "math": [0,60,45,125], "px": [113.4,1570.4,1094.0,157.0]},
    "who_male_weight": {"pdf": "who_male_bbu.pdf", "math": [0,60,2,28], "px": [113.4,1570.4,1094.0,157.0]},
    "who_female_weight": {"pdf": "who_female_bbu.pdf", "math": [0,60,2,30], "px": [113.4,1570.4,1094.0,157.0]},
    "who_male_imtu": {"pdf": "who_male_imtu.pdf", "math": [0,60,10,22], "px": [113.4,1570.4,1094.0,157.0]},
    "who_female_imtu": {"pdf": "who_female_imtu.pdf", "math": [0,60,10,22], "px": [113.4,1570.4,1094.0,157.0]},
    "who_male_weight_length": {"pdf": "who_male_bbpb.pdf", "math": [45,110,2,24], "px": [113.4,1570.4,1094.0,157.0]},
    "who_female_weight_length": {"pdf": "who_female_bbpb.pdf", "math": [45,110,2,24], "px": [113.4,1570.4,1094.0,157.0]},
    "who_male_headcirc": {"pdf": "who_male_lku.pdf", "math": [0,60,30,54], "px": [210.6,953.6,1368.8,248.0]},
    "who_female_headcirc": {"pdf": "who_female_lku.pdf", "math": [0,60,30,54], "px": [211.0,952.6,1368.8,248.0]},
    "cdc_male_bmi": {"pdf": "cdc_male_bmi.pdf", "math": [24,240,12,35], "px": [164.0,1045.4,1383.8,155.8]},
    "cdc_female_bmi": {"pdf": "cdc_female_bmi.pdf", "math": [24,240,12,35], "px": [164.0,1045.4,1383.8,155.8]},
    "cdc_male_stature": {"pdf": "cdc_male_stature.pdf", "math": [24,240,80,190], "px": [164.0,1045.4,1124.9,238.8]},
    "cdc_female_stature": {"pdf": "cdc_female_stature.pdf", "math": [24,240,80,190], "px": [164.0,1045.4,1124.9,238.8]},
    "cdc_male_weight": {"pdf": "cdc_male_stature.pdf", "math": [24,240,10,100], "px": [164.0,1045.4,1407.4,683.4]},
    "cdc_female_weight": {"pdf": "cdc_female_stature.pdf", "math": [24,240,10,100], "px": [164.0,1045.4,1407.4,683.4]},
}

for key in sorted(charts.keys()):
    c = charts[key]
    m = c["math"]
    p = c["px"]
    js_lines.append(f'    "{key}": {{')
    js_lines.append(f'        "pdfUrl": "assets/pdfs/{c["pdf"]}",')
    js_lines.append(f'        "mathBounds": {{"xMin": {m[0]}, "xMax": {m[1]}, "yMin": {m[2]}, "yMax": {m[3]}}},')
    js_lines.append(f'        "pixelBounds": {{"xMin": {p[0]}, "xMax": {p[1]}, "yMin": {p[2]}, "yMax": {p[3]}}}')
    js_lines.append('    },')

js_lines.append("};")
js_lines.append("")
js_lines.append("window.calculateOfficialPixelCoords = function(chartKey, xAxisValue, yAxisValue) {")
js_lines.append("    const chart = window.OfficialChartsDB[chartKey];")
js_lines.append("    if (!chart) return null;")
js_lines.append("")
js_lines.append("    const math = chart.mathBounds;")
js_lines.append("    const px = chart.pixelBounds;")
js_lines.append("")
js_lines.append("    // Calculate position without clamping so we can plot points slightly outside bounds")
js_lines.append("    const xRatio = (xAxisValue - math.xMin) / (math.xMax - math.xMin);")
js_lines.append("    const pixelX = px.xMin + xRatio * (px.xMax - px.xMin);")
js_lines.append("")
js_lines.append("    const yRatio = (yAxisValue - math.yMin) / (math.yMax - math.yMin);")
js_lines.append("    const pixelY = px.yMin + yRatio * (px.yMax - px.yMin);")
js_lines.append("")
js_lines.append("    return { x: pixelX, y: pixelY };")
js_lines.append("};")

out_path = os.path.join(os.path.dirname(__file__), '..', 'official-charts-calibration.js')
with open(out_path, 'w') as f:
    f.write("\\n".join(js_lines) + "\\n")
print(f"Wrote {out_path}")
