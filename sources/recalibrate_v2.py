"""
FINAL V2: Hybrid calibration using grid lines + known WHO/CDC math bounds.

For WHO charts: The outer grid lines correspond to the full axis range.
  - leftmost vertical line = x-axis minimum (month 0 or cm 45)
  - rightmost vertical line = x-axis maximum (month 60 or cm 110)  
  - topmost horizontal line = y-axis maximum
  - bottommost horizontal line = y-axis minimum

For CDC charts: Use text labels on X-axis + grid lines for Y.

All coordinates output at SCALE=2.0 to match charting.js render.
"""
import fitz
import json
import os
import re
import statistics

SCALE = 2.0
PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'pdfs')


def get_grid_bounds(page):
    """Find the chart grid from drawings."""
    pw, ph = page.rect.width, page.rect.height
    drawings = page.get_drawings()
    
    h_lines = []
    v_lines = []
    
    for d in drawings:
        for item in d['items']:
            if item[0] == 'l':
                p1, p2 = item[1], item[2]
                x1, y1 = p1.x, p1.y
                x2, y2 = p2.x, p2.y
                length = ((x2-x1)**2 + (y2-y1)**2)**0.5
                
                if abs(y2 - y1) < 0.5 and length > pw * 0.3:
                    h_lines.append((y1+y2)/2)
                elif abs(x2 - x1) < 0.5 and length > ph * 0.3:
                    v_lines.append((x1+x2)/2)
    
    if not h_lines or not v_lines:
        return None
    
    h_ys = sorted(set(round(y, 1) for y in h_lines))
    v_xs = sorted(set(round(x, 1) for x in v_lines))
    
    return {
        'left': v_xs[0],
        'right': v_xs[-1], 
        'top': h_ys[0],
        'bottom': h_ys[-1],
    }


def get_numeric_spans(page, grid):
    """Get all numeric text spans near the grid."""
    spans = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") == 0:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span["text"].strip()
                    bbox = span["bbox"]
                    m = re.match(r'^(\d+)$', text)
                    if m:
                        spans.append({
                            "value": int(m.group(1)),
                            "text": text,
                            "cx": (bbox[0] + bbox[2]) / 2,
                            "cy": (bbox[1] + bbox[3]) / 2,
                            "x0": bbox[0], "x1": bbox[2],
                            "y0": bbox[1], "y1": bbox[3],
                            "size": span.get("size", 0),
                        })
    return spans


def find_cdc_x_anchors(spans, grid):
    """CDC x-axis labels (years 2-20, at bottom of grid)."""
    anchors = []
    for s in spans:
        if s['cy'] < grid['bottom']:
            continue
        if s['cx'] < grid['left'] - 10 or s['cx'] > grid['right'] + 10:
            continue
        if 2 <= s['value'] <= 20 and s['size'] > 9:  # year labels are larger font
            anchors.append({'months': s['value'] * 12, 'pixel_x': s['cx']})
    
    # Deduplicate
    by_m = {}
    for a in anchors:
        if a['months'] not in by_m:
            by_m[a['months']] = []
        by_m[a['months']].append(a['pixel_x'])
    
    return [{'value': m, 'px': statistics.mean(ps)} for m, ps in sorted(by_m.items())]


def linear_fit(points, key_val, key_px, target_min, target_max):
    """Fit a linear model val->px and extrapolate to targets."""
    if len(points) < 2:
        return None
    
    vals = [p[key_val] for p in points]
    pxs = [p[key_px] for p in points]
    n = len(vals)
    
    sx = sum(vals)
    sy = sum(pxs)
    sxx = sum(v*v for v in vals)
    sxy = sum(v*p for v, p in zip(vals, pxs))
    
    denom = n * sxx - sx * sx
    if abs(denom) < 1e-10:
        return None
    
    a = (n * sxy - sx * sy) / denom
    b = (sy - a * sx) / n
    
    return {
        'min_px': a * target_min + b,
        'max_px': a * target_max + b,
    }


def calibrate_who(pdf_name, js_key, math_bounds):
    """Calibrate a WHO chart using grid bounds = axis bounds."""
    fp = os.path.join(PDF_DIR, pdf_name)
    if not os.path.exists(fp):
        return None
    
    doc = fitz.open(fp)
    page = doc[0]
    grid = get_grid_bounds(page)
    doc.close()
    
    if not grid:
        return None
    
    # For WHO charts, grid boundaries ARE the axis boundaries
    return {
        "pdfUrl": f"assets/pdfs/{pdf_name}",
        "mathBounds": math_bounds,
        "pixelBounds": {
            "xMin": round(grid['left'] * SCALE, 2),
            "xMax": round(grid['right'] * SCALE, 2),
            "yMin": round(grid['bottom'] * SCALE, 2),  # bottom = yMin (math)
            "yMax": round(grid['top'] * SCALE, 2),      # top = yMax (math)
        }
    }


def calibrate_cdc_bmi(pdf_name, js_key, math_bounds):
    """Calibrate CDC BMI chart using X text labels + grid Y bounds."""
    fp = os.path.join(PDF_DIR, pdf_name)
    if not os.path.exists(fp):
        return None
    
    doc = fitz.open(fp)
    page = doc[0]
    grid = get_grid_bounds(page)
    spans = get_numeric_spans(page, grid)
    
    if not grid:
        doc.close()
        return None
    
    # X-axis from text labels
    x_anchors = find_cdc_x_anchors(spans, grid)
    x_fit = linear_fit(x_anchors, 'value', 'px', math_bounds['xMin'], math_bounds['xMax'])
    
    if not x_fit:
        doc.close()
        return None
    
    # Y-axis: find numeric labels to the left of grid
    y_labels = []
    for s in spans:
        if s['x1'] > grid['left'] - 2:
            continue
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        if math_bounds['yMin'] - 2 <= s['value'] <= math_bounds['yMax'] + 2:
            y_labels.append({'value': s['value'], 'px': s['cy']})
    
    # Deduplicate
    by_v = {}
    for l in y_labels:
        if l['value'] not in by_v:
            by_v[l['value']] = []
        by_v[l['value']].append(l['px'])
    y_labels = [{'value': v, 'px': statistics.mean(ps)} for v, ps in sorted(by_v.items())]
    
    if len(y_labels) < 2:
        # Fallback: try wider search
        y_labels = []
        for s in spans:
            if s['x1'] > grid['left'] + 20:
                continue
            if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
                continue
            if math_bounds['yMin'] - 2 <= s['value'] <= math_bounds['yMax'] + 2:
                y_labels.append({'value': s['value'], 'px': s['cy']})
        by_v = {}
        for l in y_labels:
            if l['value'] not in by_v:
                by_v[l['value']] = []
            by_v[l['value']].append(l['px'])
        y_labels = [{'value': v, 'px': statistics.mean(ps)} for v, ps in sorted(by_v.items())]
    
    y_fit = linear_fit(y_labels, 'value', 'px', math_bounds['yMin'], math_bounds['yMax'])
    
    doc.close()
    
    if not y_fit:
        # Fallback: use grid boundaries for Y
        return {
            "pdfUrl": f"assets/pdfs/{pdf_name}",
            "mathBounds": math_bounds,
            "pixelBounds": {
                "xMin": round(x_fit['min_px'] * SCALE, 2),
                "xMax": round(x_fit['max_px'] * SCALE, 2),
                "yMin": round(grid['bottom'] * SCALE, 2),
                "yMax": round(grid['top'] * SCALE, 2),
            }
        }
    
    return {
        "pdfUrl": f"assets/pdfs/{pdf_name}",
        "mathBounds": math_bounds,
        "pixelBounds": {
            "xMin": round(x_fit['min_px'] * SCALE, 2),
            "xMax": round(x_fit['max_px'] * SCALE, 2),
            "yMin": round(y_fit['min_px'] * SCALE, 2),
            "yMax": round(y_fit['max_px'] * SCALE, 2),
        }
    }


def calibrate_cdc_stature(gender):
    """Calibrate CDC stature/weight dual chart."""
    pdf_name = f"cdc_{gender}_stature.pdf"
    fp = os.path.join(PDF_DIR, pdf_name)
    if not os.path.exists(fp):
        return {}
    
    doc = fitz.open(fp)
    page = doc[0]
    grid = get_grid_bounds(page)
    spans = get_numeric_spans(page, grid)
    
    if not grid:
        doc.close()
        return {}
    
    # X-axis labels (shared)
    x_anchors = find_cdc_x_anchors(spans, grid)
    x_fit = linear_fit(x_anchors, 'value', 'px', 24, 240)
    
    if not x_fit:
        doc.close()
        return {}
    
    # For CDC stature/weight dual chart:
    # The chart has TWO Y-axis scales.
    # Right side has cm (stature) and kg (weight) labels.
    # We need to find them.
    
    right_labels = []
    for s in spans:
        if s['x0'] < grid['right'] - 5:
            continue
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        right_labels.append({'value': s['value'], 'px': s['cy'], 'size': s['size']})
    
    right_labels.sort(key=lambda l: l['px'])
    
    # Left side labels
    left_labels = []
    for s in spans:
        if s['x1'] > grid['left'] + 5:
            continue
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        left_labels.append({'value': s['value'], 'px': s['cy'], 'size': s['size']})
    
    left_labels.sort(key=lambda l: l['px'])
    
    doc.close()
    
    results = {}
    mid_y = (grid['top'] + grid['bottom']) / 2
    
    # Try right-side cm labels for stature (60-200 range, upper half)
    stature_anchors = [l for l in right_labels if l['px'] < mid_y and 60 <= l['value'] <= 200]
    if not stature_anchors:
        # Try left-side (in/cm)
        stature_anchors = [l for l in left_labels if l['px'] < mid_y and 30 <= l['value'] <= 77]
    
    # Try right-side kg labels for weight (10-110 range, lower half)
    weight_anchors = [l for l in right_labels if l['px'] >= mid_y and 5 <= l['value'] <= 110]
    if not weight_anchors:
        weight_anchors = [l for l in left_labels if l['px'] >= mid_y and 20 <= l['value'] <= 240]
    
    # Deduplicate stature anchors
    by_v = {}
    for a in stature_anchors:
        if a['value'] not in by_v:
            by_v[a['value']] = []
        by_v[a['value']].append(a['px'])
    stature_anchors = [{'value': v, 'px': statistics.mean(ps)} for v, ps in sorted(by_v.items())]
    
    # Deduplicate weight anchors
    by_v = {}
    for a in weight_anchors:
        if a['value'] not in by_v:
            by_v[a['value']] = []
        by_v[a['value']].append(a['px'])
    weight_anchors = [{'value': v, 'px': statistics.mean(ps)} for v, ps in sorted(by_v.items())]
    
    if len(stature_anchors) >= 2:
        s_fit = linear_fit(stature_anchors, 'value', 'px', 80, 190)
        if s_fit:
            results[f"cdc_{gender}_stature"] = {
                "pdfUrl": f"assets/pdfs/{pdf_name}",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
                "pixelBounds": {
                    "xMin": round(x_fit['min_px'] * SCALE, 2),
                    "xMax": round(x_fit['max_px'] * SCALE, 2),
                    "yMin": round(s_fit['min_px'] * SCALE, 2),
                    "yMax": round(s_fit['max_px'] * SCALE, 2),
                }
            }
    
    if len(weight_anchors) >= 2:
        w_fit = linear_fit(weight_anchors, 'value', 'px', 10, 100)
        if w_fit:
            results[f"cdc_{gender}_weight"] = {
                "pdfUrl": f"assets/pdfs/{pdf_name}",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
                "pixelBounds": {
                    "xMin": round(x_fit['min_px'] * SCALE, 2),
                    "xMax": round(x_fit['max_px'] * SCALE, 2),
                    "yMin": round(w_fit['min_px'] * SCALE, 2),
                    "yMax": round(w_fit['max_px'] * SCALE, 2),
                }
            }
    
    return results


def main():
    results = {}
    
    # WHO Charts - use grid = axis approach
    who_charts = [
        ("who_male_tbu.pdf", "who_male_stature", {"xMin":0,"xMax":60,"yMin":45,"yMax":125}),
        ("who_female_tbu.pdf", "who_female_stature", {"xMin":0,"xMax":60,"yMin":45,"yMax":125}),
        ("who_male_bbu.pdf", "who_male_weight", {"xMin":0,"xMax":60,"yMin":2,"yMax":28}),
        ("who_female_bbu.pdf", "who_female_weight", {"xMin":0,"xMax":60,"yMin":2,"yMax":30}),
        ("who_male_imtu.pdf", "who_male_imtu", {"xMin":0,"xMax":60,"yMin":10,"yMax":22}),
        ("who_female_imtu.pdf", "who_female_imtu", {"xMin":0,"xMax":60,"yMin":10,"yMax":22}),
        ("who_male_lku.pdf", "who_male_headcirc", {"xMin":0,"xMax":60,"yMin":30,"yMax":54}),
        ("who_female_lku.pdf", "who_female_headcirc", {"xMin":0,"xMax":60,"yMin":30,"yMax":54}),
        ("who_male_bbpb.pdf", "who_male_weight_length", {"xMin":45,"xMax":110,"yMin":2,"yMax":24}),
        ("who_female_bbpb.pdf", "who_female_weight_length", {"xMin":45,"xMax":110,"yMin":2,"yMax":24}),
    ]
    
    for pdf, key, math in who_charts:
        r = calibrate_who(pdf, key, math)
        if r:
            results[key] = r
            pb = r['pixelBounds']
            print(f"OK  {key}: xMin={pb['xMin']:.1f} xMax={pb['xMax']:.1f} yMin={pb['yMin']:.1f} yMax={pb['yMax']:.1f}")
        else:
            print(f"FAIL {key}")
    
    # CDC BMI
    for pdf, key, math in [
        ("cdc_male_bmi.pdf", "cdc_male_bmi", {"xMin":24,"xMax":240,"yMin":12,"yMax":35}),
        ("cdc_female_bmi.pdf", "cdc_female_bmi", {"xMin":24,"xMax":240,"yMin":12,"yMax":35}),
    ]:
        r = calibrate_cdc_bmi(pdf, key, math)
        if r:
            results[key] = r
            pb = r['pixelBounds']
            print(f"OK  {key}: xMin={pb['xMin']:.1f} xMax={pb['xMax']:.1f} yMin={pb['yMin']:.1f} yMax={pb['yMax']:.1f}")
        else:
            print(f"FAIL {key}")
    
    # CDC Stature/Weight
    for gender in ['male', 'female']:
        dual = calibrate_cdc_stature(gender)
        for k, v in dual.items():
            results[k] = v
            pb = v['pixelBounds']
            print(f"OK  {k}: xMin={pb['xMin']:.1f} xMax={pb['xMax']:.1f} yMin={pb['yMin']:.1f} yMax={pb['yMax']:.1f}")
    
    # Generate JS output
    js_lines = [
        "// OFFICIAL PDF CHART CALIBRATION DATA",
        "// Generated by recalibrate_v2.py",
        "// All pixel coordinates at scale=2.0x (matching charting.js render)",
        "// pixelBounds: yMin = bottom of chart (high pixel Y), yMax = top (low pixel Y)",
        "window.OfficialChartsDB = {",
    ]
    
    for key in sorted(results.keys()):
        d = results[key]
        mb = d['mathBounds']
        pb = d['pixelBounds']
        js_lines.append(f'    "{key}": {{')
        js_lines.append(f'        "pdfUrl": "{d["pdfUrl"]}",')
        js_lines.append(f'        "mathBounds": {{"xMin": {mb["xMin"]}, "xMax": {mb["xMax"]}, "yMin": {mb["yMin"]}, "yMax": {mb["yMax"]}}},')
        js_lines.append(f'        "pixelBounds": {{"xMin": {pb["xMin"]}, "xMax": {pb["xMax"]}, "yMin": {pb["yMin"]}, "yMax": {pb["yMax"]}}}')
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
    js_lines.append("    // Linear interpolation: math value -> pixel position")
    js_lines.append("    const xRatio = (xAxisValue - math.xMin) / (math.xMax - math.xMin);")
    js_lines.append("    const pixelX = px.xMin + xRatio * (px.xMax - px.xMin);")
    js_lines.append("")
    js_lines.append("    const yRatio = (yAxisValue - math.yMin) / (math.yMax - math.yMin);")
    js_lines.append("    const pixelY = px.yMin + yRatio * (px.yMax - px.yMin);")
    js_lines.append("")
    js_lines.append("    return { x: pixelX, y: pixelY };")
    js_lines.append("};")
    js_lines.append("")
    
    out_js = os.path.join(os.path.dirname(__file__), '..', 'official-charts-calibration.js')
    with open(out_js, 'w') as f:
        f.write("\n".join(js_lines))
    print(f"\nWrote: {out_js}")
    
    out_json = os.path.join(os.path.dirname(__file__), 'calibration_v2.json')
    with open(out_json, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Wrote: {out_json}")


if __name__ == "__main__":
    main()
