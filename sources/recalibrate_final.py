"""
FINAL Precision Calibration Script.

Strategy: Use axis text labels as anchor points with known mathematical values.
For each axis, fit a linear model using 2+ labeled tick marks, then extrapolate
to find exact pixel coordinates for the mathematical bounds.

Key insight from analysis:
- WHO charts: X-axis shows years (Birth, 1 year, 2 years, etc.) with sub-ticks in months
- CDC charts: X-axis shows years (2, 3, 4, ..., 20)
- Y-axis labels are numeric values on the left side
- Grid lines from drawings give additional confirmation

Output: Updated official-charts-calibration.js with precise coordinates.
"""

import fitz
import json
import os
import re
import statistics

SCALE = 2.0
PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'pdfs')

# Known chart specifications
CHART_SPECS = {
    # WHO 0-5 years (landscape PDFs, 841.9 x 595.3 pts)
    # X-axis: 0-60 months, labeled as "Birth", "1 year", "2 years", etc.
    # Y-axis: varies by indicator
    "who_male_tbu": {
        "pdf": "who_male_tbu.pdf",
        "js_key": "who_male_stature",
        "math": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
        "x_unit": "months_who",  # WHO uses combined month/year labels
        "y_numbers": True,
    },
    "who_female_tbu": {
        "pdf": "who_female_tbu.pdf",
        "js_key": "who_female_stature",
        "math": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_male_bbu": {
        "pdf": "who_male_bbu.pdf",
        "js_key": "who_male_weight",
        "math": {"xMin": 0, "xMax": 60, "yMin": 2, "yMax": 28},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_female_bbu": {
        "pdf": "who_female_bbu.pdf",
        "js_key": "who_female_weight",
        "math": {"xMin": 0, "xMax": 60, "yMin": 2, "yMax": 30},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_male_imtu": {
        "pdf": "who_male_imtu.pdf",
        "js_key": "who_male_imtu",
        "math": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_female_imtu": {
        "pdf": "who_female_imtu.pdf",
        "js_key": "who_female_imtu",
        "math": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_male_lku": {
        "pdf": "who_male_lku.pdf",
        "js_key": "who_male_headcirc",
        "math": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 54},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_female_lku": {
        "pdf": "who_female_lku.pdf",
        "js_key": "who_female_headcirc",
        "math": {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 54},
        "x_unit": "months_who",
        "y_numbers": True,
    },
    "who_male_bbpb": {
        "pdf": "who_male_bbpb.pdf",
        "js_key": "who_male_weight_length",
        "math": {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
        "x_unit": "cm",
        "y_numbers": True,
    },
    "who_female_bbpb": {
        "pdf": "who_female_bbpb.pdf",
        "js_key": "who_female_weight_length",
        "math": {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
        "x_unit": "cm",
        "y_numbers": True,
    },
    # CDC 2-20 years (portrait PDFs, 612 x 792 pts)
    # Stature PDFs contain TWO grids (stature + weight)
    "cdc_male_bmi": {
        "pdf": "cdc_male_bmi.pdf",
        "js_key": "cdc_male_bmi",
        "math": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "x_unit": "years_cdc",  # Labels in years 2-20 (= months 24-240)
        "y_numbers": True,
    },
    "cdc_female_bmi": {
        "pdf": "cdc_female_bmi.pdf",
        "js_key": "cdc_female_bmi",
        "math": {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
        "x_unit": "years_cdc",
        "y_numbers": True,
    },
}


def get_grid_bounds_from_drawings(page):
    """Find the chart grid boundary from line drawings."""
    drawings = page.get_drawings()
    pw, ph = page.rect.width, page.rect.height
    
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
                    h_lines.append({'y': (y1+y2)/2, 'x_start': min(x1,x2), 'x_end': max(x1,x2), 'length': length})
                elif abs(x2 - x1) < 0.5 and length > ph * 0.3:
                    v_lines.append({'x': (x1+x2)/2, 'y_start': min(y1,y2), 'y_end': max(y1,y2), 'length': length})
    
    if not h_lines or not v_lines:
        return None
    
    h_ys = sorted(set([round(l['y'], 1) for l in h_lines]))
    v_xs = sorted(set([round(l['x'], 1) for l in v_lines]))
    
    return {
        'left': min(v_xs),
        'right': max(v_xs),
        'top': min(h_ys),
        'bottom': max(h_ys),
    }


def get_text_spans(page):
    """Extract all text spans."""
    spans = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") == 0:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span["text"].strip()
                    bbox = span["bbox"]
                    if text:
                        spans.append({
                            "text": text,
                            "x0": bbox[0], "y0": bbox[1],
                            "x1": bbox[2], "y1": bbox[3],
                            "cx": (bbox[0] + bbox[2]) / 2,
                            "cy": (bbox[1] + bbox[3]) / 2,
                            "size": span.get("size", 0),
                        })
    return spans


def find_y_axis_anchors(spans, grid, math_bounds):
    """
    Find Y-axis numeric labels and their pixel positions.
    These are to the LEFT of the grid.
    """
    anchors = []
    for s in spans:
        # Must be to the left of the grid
        if s['x1'] > grid['left'] + 5:
            continue
        # Must be vertically within the grid
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        # Must be a number within the expected range
        text = s['text'].replace(',', '').strip()
        m = re.match(r'^(\d+(\.\d+)?)$', text)
        if m:
            val = float(m.group(1))
            # Only include values in the expected Y range
            if math_bounds['yMin'] - 5 <= val <= math_bounds['yMax'] + 5:
                anchors.append({'value': val, 'pixel_y': s['cy']})
    
    # Deduplicate by value (take average position if same value appears multiple times)
    by_val = {}
    for a in anchors:
        v = a['value']
        if v not in by_val:
            by_val[v] = []
        by_val[v].append(a['pixel_y'])
    
    result = [{'value': v, 'pixel_y': statistics.mean(positions)} for v, positions in sorted(by_val.items())]
    return result


def find_x_axis_anchors_cdc(spans, grid):
    """
    Find X-axis labels for CDC charts (years 2-20).
    Labels are BELOW the grid.
    """
    anchors = []
    for s in spans:
        # Must be below the grid
        if s['cy'] < grid['bottom']:
            continue
        # Must be horizontally within the grid
        if s['cx'] < grid['left'] - 10 or s['cx'] > grid['right'] + 10:
            continue
        # Must be a number (year label)
        text = s['text'].strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            year = int(m.group(1))
            if 2 <= year <= 20:
                months = year * 12  # Convert years to months
                anchors.append({'value': months, 'pixel_x': s['cx'], 'year': year})
    
    # Deduplicate
    by_val = {}
    for a in anchors:
        v = a['value']
        if v not in by_val:
            by_val[v] = []
        by_val[v].append(a['pixel_x'])
    
    result = [{'value': v, 'pixel_x': statistics.mean(positions)} for v, positions in sorted(by_val.items())]
    return result


def find_x_axis_anchors_who(spans, grid):
    """
    Find X-axis labels for WHO charts.
    WHO charts label X-axis with months as sub-numbers (2, 4, 6, 8, 10) 
    beneath year labels (Birth, 1 year, 2 years, 3 years, 4 years, 5 years).
    
    The small numbers (2,4,6,8,10) appear between year markers.
    We use the YEAR markers as primary anchors since they're more reliable.
    """
    # First find "Birth" label and year labels
    anchors = []
    
    for s in spans:
        if s['cy'] < grid['bottom'] - 5:
            continue
        if s['cx'] < grid['left'] - 10 or s['cx'] > grid['right'] + 10:
            continue
        
        text = s['text'].strip().lower()
        
        if 'birth' in text:
            anchors.append({'value': 0, 'pixel_x': s['cx'], 'label': 'Birth'})
        elif text in ['1 year', '1year']:
            anchors.append({'value': 12, 'pixel_x': s['cx'], 'label': '1 year'})
        elif text in ['2 years', '2years']:
            anchors.append({'value': 24, 'pixel_x': s['cx'], 'label': '2 years'})
        elif text in ['3 years', '3years']:
            anchors.append({'value': 36, 'pixel_x': s['cx'], 'label': '3 years'})
        elif text in ['4 years', '4years']:
            anchors.append({'value': 48, 'pixel_x': s['cx'], 'label': '4 years'})
        elif text in ['5 years', '5years']:
            anchors.append({'value': 60, 'pixel_x': s['cx'], 'label': '5 years'})
    
    # If no year labels found, try using the small month numbers
    # These appear near the bottom at regular intervals
    if len(anchors) < 2:
        # Look for sub-labels: numbers that are in the grid's x-axis area
        sub_spans = []
        for s in spans:
            if s['cy'] < grid['bottom'] - 5 or s['cy'] > grid['bottom'] + 30:
                continue
            if s['cx'] < grid['left'] - 10 or s['cx'] > grid['right'] + 10:
                continue
            text = s['text'].strip()
            m = re.match(r'^(\d+)$', text)
            if m:
                val = int(m.group(1))
                if val in [2, 4, 6, 8, 10]:
                    sub_spans.append({'value': val, 'pixel_x': s['cx'], 'cy': s['cy']})
        
        # Group sub-labels by their Y position to separate the rows
        # (WHO charts show months 2,4,6,8,10 repeating for each year)
        if sub_spans:
            # Use grid vertical lines to figure out which month each number represents
            # For now, use the grid-based approach instead
            pass
    
    return anchors


def find_x_axis_anchors_cm(spans, grid, math_bounds):
    """
    Find X-axis labels for BB/PB charts (in cm).
    """
    anchors = []
    for s in spans:
        if s['cy'] < grid['bottom'] - 5:
            continue
        if s['cx'] < grid['left'] - 10 or s['cx'] > grid['right'] + 10:
            continue
        text = s['text'].strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            val = int(m.group(1))
            if math_bounds['xMin'] - 5 <= val <= math_bounds['xMax'] + 5:
                anchors.append({'value': val, 'pixel_x': s['cx']})
    
    by_val = {}
    for a in anchors:
        v = a['value']
        if v not in by_val:
            by_val[v] = []
        by_val[v].append(a['pixel_x'])
    
    return [{'value': v, 'pixel_x': statistics.mean(p)} for v, p in sorted(by_val.items())]


def linear_fit_extrapolate(anchors, key, target_min, target_max):
    """
    Given (value, pixel) pairs, fit a linear model and extrapolate
    to find pixel position for target_min and target_max.
    
    Returns (pixel_at_min, pixel_at_max) or None if insufficient data.
    """
    if len(anchors) < 2:
        return None
    
    # Use least squares fit for robustness with multiple points
    n = len(anchors)
    vals = [a['value'] for a in anchors]
    pixels = [a[key] for a in anchors]
    
    sum_v = sum(vals)
    sum_p = sum(pixels)
    sum_vv = sum(v*v for v in vals)
    sum_vp = sum(v*p for v, p in zip(vals, pixels))
    
    denom = n * sum_vv - sum_v * sum_v
    if abs(denom) < 1e-10:
        return None
    
    a = (n * sum_vp - sum_v * sum_p) / denom  # slope
    b = (sum_p - a * sum_v) / n               # intercept
    
    # Compute residuals for quality check
    residuals = [abs(a * v + b - p) for v, p in zip(vals, pixels)]
    max_residual = max(residuals)
    avg_residual = sum(residuals) / len(residuals)
    
    px_min = a * target_min + b
    px_max = a * target_max + b
    
    return {
        'min': px_min,
        'max': px_max,
        'slope': a,
        'intercept': b,
        'max_residual': max_residual,
        'avg_residual': avg_residual,
        'n_points': n,
    }


def process_chart(spec):
    """Process one chart and return calibration data."""
    filepath = os.path.join(PDF_DIR, spec['pdf'])
    if not os.path.exists(filepath):
        print(f"  SKIP: {filepath} not found")
        return None
    
    doc = fitz.open(filepath)
    page = doc[0]
    
    grid = get_grid_bounds_from_drawings(page)
    if not grid:
        print(f"  ERROR: Could not find grid boundaries")
        doc.close()
        return None
    
    spans = get_text_spans(page)
    math = spec['math']
    
    print(f"  Grid: left={grid['left']:.1f} right={grid['right']:.1f} top={grid['top']:.1f} bottom={grid['bottom']:.1f}")
    
    # --- Y axis ---
    y_anchors = find_y_axis_anchors(spans, grid, math)
    print(f"  Y anchors: {[(a['value'], round(a['pixel_y'],1)) for a in y_anchors]}")
    
    y_fit = linear_fit_extrapolate(y_anchors, 'pixel_y', math['yMin'], math['yMax'])
    
    # --- X axis ---
    if spec['x_unit'] == 'years_cdc':
        x_anchors = find_x_axis_anchors_cdc(spans, grid)
    elif spec['x_unit'] == 'months_who':
        x_anchors = find_x_axis_anchors_who(spans, grid)
        
        # If WHO year labels failed, use the grid lines as reference
        # WHO charts have vertical grid lines at regular month intervals
        if len(x_anchors) < 2:
            print(f"  WHO year labels found: {len(x_anchors)} — using grid lines instead")
            # Use grid boundaries: leftmost vertical line = month 0, rightmost = month 60
            x_anchors = [
                {'value': 0, 'pixel_x': grid['left']},
                {'value': 60, 'pixel_x': grid['right']},
            ]
    elif spec['x_unit'] == 'cm':
        x_anchors = find_x_axis_anchors_cm(spans, grid, math)
    else:
        x_anchors = []
    
    print(f"  X anchors: {[(a['value'], round(a['pixel_x'],1)) for a in x_anchors]}")
    
    x_fit = linear_fit_extrapolate(x_anchors, 'pixel_x', math['xMin'], math['xMax'])
    
    doc.close()
    
    if not y_fit or not x_fit:
        print(f"  ERROR: Insufficient anchors for fitting")
        return None
    
    print(f"  X fit: {x_fit['n_points']} pts, avg_err={x_fit['avg_residual']:.1f}px, max_err={x_fit['max_residual']:.1f}px")
    print(f"  Y fit: {y_fit['n_points']} pts, avg_err={y_fit['avg_residual']:.1f}px, max_err={y_fit['max_residual']:.1f}px")
    
    return {
        "pdfUrl": f"assets/pdfs/{spec['pdf']}",
        "mathBounds": math,
        "pixelBounds": {
            "xMin": round(x_fit['min'] * SCALE, 2),
            "xMax": round(x_fit['max'] * SCALE, 2),
            "yMin": round(y_fit['min'] * SCALE, 2),  # yMin math = bottom of chart = large pixel Y
            "yMax": round(y_fit['max'] * SCALE, 2),   # yMax math = top of chart = small pixel Y
        }
    }


def process_cdc_stature(gender):
    """
    CDC stature/weight combined chart.
    Two separate Y-axis grids sharing the same X-axis.
    """
    filepath = os.path.join(PDF_DIR, f"cdc_{gender}_stature.pdf")
    if not os.path.exists(filepath):
        return {}
    
    doc = fitz.open(filepath)
    page = doc[0]
    grid = get_grid_bounds_from_drawings(page)
    spans = get_text_spans(page)
    
    if not grid:
        doc.close()
        return {}
    
    print(f"\n  CDC {gender} stature/weight dual chart")
    print(f"  Grid: left={grid['left']:.1f} right={grid['right']:.1f} top={grid['top']:.1f} bottom={grid['bottom']:.1f}")
    
    # X-axis: shared, years 2-20
    x_anchors = find_x_axis_anchors_cdc(spans, grid)
    print(f"  X anchors ({len(x_anchors)}): {[(a['value'], round(a['pixel_x'],1)) for a in x_anchors[:5]]}...{[(a['value'], round(a['pixel_x'],1)) for a in x_anchors[-3:]]}")
    
    x_fit = linear_fit_extrapolate(x_anchors, 'pixel_x', 24, 240)
    
    if not x_fit:
        doc.close()
        return {}
    
    # Y-axis: We need to separate stature and weight labels
    # Stature labels are in the upper half, weight labels in the lower half
    all_y_labels = []
    for s in spans:
        if s['x1'] > grid['left'] + 5:
            continue
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        text = s['text'].replace(',', '').strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            all_y_labels.append({'value': int(m.group(1)), 'pixel_y': s['cy']})
    
    # Also check RIGHT side labels
    for s in spans:
        if s['x0'] < grid['right'] - 5:
            continue
        if s['cy'] < grid['top'] - 10 or s['cy'] > grid['bottom'] + 10:
            continue
        text = s['text'].replace(',', '').strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            val = int(m.group(1))
            # Check if this value is already captured from the left
            if not any(a['value'] == val and abs(a['pixel_y'] - s['cy']) < 5 for a in all_y_labels):
                all_y_labels.append({'value': val, 'pixel_y': s['cy']})
    
    # CDC stature chart (inches to cm):
    # Top grid: stature in INCHES on left, cm on right (30-62 in / ~76-157 cm)
    # Bottom grid: weight in lb on left, kg on right (20-220 lb / ~9-100 kg)
    
    # Separate into stature (upper) and weight (lower) by finding the gap
    all_y_labels.sort(key=lambda a: a['pixel_y'])
    
    # Find the midpoint of the page
    mid_y = (grid['top'] + grid['bottom']) / 2
    
    stature_labels = [a for a in all_y_labels if a['pixel_y'] < mid_y]
    weight_labels = [a for a in all_y_labels if a['pixel_y'] >= mid_y]
    
    print(f"  Stature Y labels: {[(a['value'], round(a['pixel_y'],1)) for a in stature_labels]}")
    print(f"  Weight Y labels: {[(a['value'], round(a['pixel_y'],1)) for a in weight_labels]}")
    
    results = {}
    
    # Stature grid: values 30-77 inches on left axis  
    # But our math bounds are in cm: 80-190
    # The CDC PDF uses inches! Need to check...
    # Actually looking at the existing calibration, CDC stature math bounds are yMin=80, yMax=190 (cm)
    # But the labels show INCHES. Let's check what the right-side labels show.
    
    # For CDC stature: check right-side labels which should be in cm
    right_stature = []
    for s in spans:
        if s['x0'] < grid['right'] - 5:
            continue
        if s['cy'] > mid_y:
            continue
        text = s['text'].replace(',', '').strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            val = int(m.group(1))
            if 60 <= val <= 200:
                right_stature.append({'value': val, 'pixel_y': s['cy']})
    
    right_weight = []
    for s in spans:
        if s['x0'] < grid['right'] - 5:
            continue
        if s['cy'] <= mid_y:
            continue
        text = s['text'].replace(',', '').strip()
        m = re.match(r'^(\d+)$', text)
        if m:
            val = int(m.group(1))
            if 5 <= val <= 105:
                right_weight.append({'value': val, 'pixel_y': s['cy']})
    
    print(f"  Right stature labels (cm): {[(a['value'], round(a['pixel_y'],1)) for a in right_stature]}")
    print(f"  Right weight labels (kg): {[(a['value'], round(a['pixel_y'],1)) for a in right_weight]}")
    
    # Use right-side labels (cm/kg) for calibration since our math is in cm/kg
    if right_stature and len(right_stature) >= 2:
        # Stature in cm
        y_fit_st = linear_fit_extrapolate(right_stature, 'pixel_y', 80, 190)
        if y_fit_st:
            results[f"cdc_{gender}_stature"] = {
                "pdfUrl": f"assets/pdfs/cdc_{gender}_stature.pdf",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
                "pixelBounds": {
                    "xMin": round(x_fit['min'] * SCALE, 2),
                    "xMax": round(x_fit['max'] * SCALE, 2),
                    "yMin": round(y_fit_st['min'] * SCALE, 2),
                    "yMax": round(y_fit_st['max'] * SCALE, 2),
                }
            }
    elif stature_labels and len(stature_labels) >= 2:
        # Fallback: use left labels (inches) and convert
        # Actually keep inches and adjust mathBounds
        y_fit_st = linear_fit_extrapolate(stature_labels, 'pixel_y', 30, 77)
        if y_fit_st:
            results[f"cdc_{gender}_stature"] = {
                "pdfUrl": f"assets/pdfs/cdc_{gender}_stature.pdf",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 30, "yMax": 77},
                "pixelBounds": {
                    "xMin": round(x_fit['min'] * SCALE, 2),
                    "xMax": round(x_fit['max'] * SCALE, 2),
                    "yMin": round(y_fit_st['min'] * SCALE, 2),
                    "yMax": round(y_fit_st['max'] * SCALE, 2),
                }
            }
    
    if right_weight and len(right_weight) >= 2:
        y_fit_wt = linear_fit_extrapolate(right_weight, 'pixel_y', 10, 100)
        if y_fit_wt:
            results[f"cdc_{gender}_weight"] = {
                "pdfUrl": f"assets/pdfs/cdc_{gender}_stature.pdf",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100},
                "pixelBounds": {
                    "xMin": round(x_fit['min'] * SCALE, 2),
                    "xMax": round(x_fit['max'] * SCALE, 2),
                    "yMin": round(y_fit_wt['min'] * SCALE, 2),
                    "yMax": round(y_fit_wt['max'] * SCALE, 2),
                }
            }
    elif weight_labels and len(weight_labels) >= 2:
        y_fit_wt = linear_fit_extrapolate(weight_labels, 'pixel_y', 20, 220)
        if y_fit_wt:
            results[f"cdc_{gender}_weight"] = {
                "pdfUrl": f"assets/pdfs/cdc_{gender}_stature.pdf",
                "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 20, "yMax": 220},
                "pixelBounds": {
                    "xMin": round(x_fit['min'] * SCALE, 2),
                    "xMax": round(x_fit['max'] * SCALE, 2),
                    "yMin": round(y_fit_wt['min'] * SCALE, 2),
                    "yMax": round(y_fit_wt['max'] * SCALE, 2),
                }
            }
    
    doc.close()
    return results


def main():
    all_results = {}
    
    print("=" * 70)
    print("PRECISION CHART CALIBRATION")
    print("=" * 70)
    
    # Process single-grid charts
    for key, spec in CHART_SPECS.items():
        print(f"\n{'─'*50}")
        print(f"Chart: {key} → {spec['js_key']}")
        result = process_chart(spec)
        if result:
            all_results[spec['js_key']] = result
    
    # Process CDC dual-grid charts
    for gender in ['male', 'female']:
        print(f"\n{'─'*50}")
        print(f"CDC {gender} stature/weight")
        dual = process_cdc_stature(gender)
        all_results.update(dual)
    
    # Generate output
    print(f"\n{'='*70}")
    print("FINAL CALIBRATION DATA")
    print(f"{'='*70}")
    
    js_lines = [
        "// OFFICIAL PDF CHART CALIBRATION DATA",
        "// Auto-generated by recalibrate_final.py", 
        f"// Pixel coordinates at scale={SCALE}x",
        "// pixelBounds.yMin = bottom of chart (large Y), yMax = top (small Y)",
        "window.OfficialChartsDB = {"
    ]
    
    for key in sorted(all_results.keys()):
        data = all_results[key]
        mb = data['mathBounds']
        pb = data['pixelBounds']
        
        print(f"\n{key}:")
        print(f"  math: x=[{mb['xMin']},{mb['xMax']}] y=[{mb['yMin']},{mb['yMax']}]")
        print(f"  pixel: xMin={pb['xMin']}, xMax={pb['xMax']}, yMin={pb['yMin']}, yMax={pb['yMax']}")
        
        js_lines.append(f'    "{key}": {{')
        js_lines.append(f'        "pdfUrl": "{data["pdfUrl"]}",')
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
    js_lines.append("    // Linear interpolation: map math value to pixel position")
    js_lines.append("    const xRatio = (xAxisValue - math.xMin) / (math.xMax - math.xMin);")
    js_lines.append("    const pixelX = px.xMin + (xRatio * (px.xMax - px.xMin));")
    js_lines.append("")
    js_lines.append("    const yRatio = (yAxisValue - math.yMin) / (math.yMax - math.yMin);")
    js_lines.append("    const pixelY = px.yMin + (yRatio * (px.yMax - px.yMin));")
    js_lines.append("")
    js_lines.append("    return { x: pixelX, y: pixelY };")
    js_lines.append("};")
    js_lines.append("")
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'official-charts-calibration.js')
    with open(output_path, 'w') as f:
        f.write("\n".join(js_lines))
    print(f"\nWrote: {output_path}")
    
    # Also save JSON for reference
    json_path = os.path.join(os.path.dirname(__file__), 'calibration_final.json')
    with open(json_path, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"Wrote: {json_path}")


if __name__ == "__main__":
    main()
