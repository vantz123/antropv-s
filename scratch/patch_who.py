import json
import re

with open('official-charts-calibration.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "who_female_weight": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 992.6, "yMax": 270.7 }',
    "who_female_stature": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 972.9, "yMax": 244.9 }',
    "who_male_weight": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 2, "yMax": 28 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 990.8, "yMax": 272.5 }',
    "who_male_stature": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 972.9, "yMax": 244.9 }',
    "who_female_bmi": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 972.9, "yMax": 290.4 }',
    "who_male_bmi": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22 },\n        "pixelBounds": { "xMin": 217.5, "xMax": 1426.6, "yMin": 972.9, "yMax": 290.4 }',
    "who_female_weight_length": '        "mathBounds": { "xMin": 45, "xMax": 120, "yMin": 2, "yMax": 24 },\n        "pixelBounds": { "xMin": 213.5, "xMax": 1608.6, "yMin": 986.2, "yMax": 277.1 }',
    "who_male_weight_length": '        "mathBounds": { "xMin": 45, "xMax": 120, "yMin": 2, "yMax": 24 },\n        "pixelBounds": { "xMin": 213.5, "xMax": 1608.6, "yMin": 986.2, "yMax": 277.1 }',
    "who_female_hc": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 30, "yMax": 52 },\n        "pixelBounds": { "xMin": 208.4, "xMax": 1327.9, "yMin": 960.6, "yMax": 307.8 }',
    "who_male_hc": '        "mathBounds": { "xMin": 0, "xMax": 60, "yMin": 32, "yMax": 54 },\n        "pixelBounds": { "xMin": 208.4, "xMax": 1327.9, "yMin": 904.2, "yMax": 275.8 }'
}

for key, bounds_str in replacements.items():
    # Regex to replace mathBounds and pixelBounds for each key
    pattern = r'("' + key + r'":\s*\{\s*"pdfUrl":\s*"[^"]+",\s*)"mathBounds":\s*\{[^}]+\},\s*"pixelBounds":\s*\{[^}]+\}'
    content = re.sub(pattern, r'\1' + bounds_str, content)

with open('official-charts-calibration.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated WHO coordinates")
