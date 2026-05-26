"""
Precision PDF Chart Recalibration Tool.

For each PDF chart in assets/pdfs/, this script:
1. Opens the PDF and extracts all text labels with their pixel positions
2. Identifies X-axis and Y-axis numeric labels
3. Computes precise pixel-to-math mapping using 2+ known reference points per axis
4. Outputs calibration JSON with correct pixelBounds at scale=2.0

CRITICAL: The pixelBounds must be at scale=2.0 to match the canvas rendering in charting.js
"""

import fitz  # PyMuPDF
import json
import re
import os
import sys
from collections import defaultdict

SCALE = 2.0  # Must match the rendering scale in charting.js
PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'pdfs')

# Known mathematical bounds for each chart type (from official WHO/CDC standards)
KNOWN_MATH_BOUNDS = {
    # WHO 0-5 years charts
    "who_male_tbu":    {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
    "who_female_tbu":  {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
    "who_male_bbu":    {"xMin": 0, "xMax": 60, "yMin": 2,  "yMax": 28},
    "who_female_bbu":  {"xMin": 0, "xMax": 60, "yMin": 2,  "yMax": 30},
    "who_male_imtu":   {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
    "who_female_imtu": {"xMin": 0, "xMax": 60, "yMin": 10, "yMax": 22},
    "who_male_lku":    {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 54},
    "who_female_lku":  {"xMin": 0, "xMax": 60, "yMin": 30, "yMax": 54},
    "who_male_bbpb":   {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
    "who_female_bbpb": {"xMin": 45, "xMax": 110, "yMin": 2, "yMax": 24},
    # CDC 2-20 years charts  
    "cdc_male_stature":   {"xMin": 24, "xMax": 240, "yMin": 30, "yMax": 77},
    "cdc_female_stature": {"xMin": 24, "xMax": 240, "yMin": 30, "yMax": 77},
    "cdc_male_bmi":       {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
    "cdc_female_bmi":     {"xMin": 24, "xMax": 240, "yMin": 12, "yMax": 35},
}


def extract_text_with_positions(page):
    """Extract all text spans with their bounding box positions."""
    text_dict = page.get_text("dict")
    spans = []
    for block in text_dict.get("blocks", []):
        if block.get("type") == 0:  # Text block
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span["text"].strip()
                    bbox = span["bbox"]  # (x0, y0, x1, y1) in PDF points
                    if text:
                        spans.append({
                            "text": text,
                            "bbox": bbox,
                            "cx": (bbox[0] + bbox[2]) / 2,
                            "cy": (bbox[1] + bbox[3]) / 2,
                            "x0": bbox[0],
                            "y0": bbox[1],
                            "x1": bbox[2],
                            "y1": bbox[3],
                        })
    return spans


def find_axis_labels(spans, page_width, page_height):
    """
    Identify X-axis labels (bottom of chart) and Y-axis labels (left of chart).
    Returns lists of (value, pixel_position) tuples.
    """
    # Separate numeric labels
    numeric_spans = []
    for s in spans:
        text = s["text"].replace(",", "").strip()
        # Match integers and decimals
        m = re.match(r'^-?\d+(\.\d+)?$', text)
        if m:
            numeric_spans.append({**s, "value": float(text)})

    if not numeric_spans:
        return [], []

    # Heuristic: Y-axis labels are on the left side, X-axis labels are at the bottom
    # Sort by x position to find left-most cluster
    by_x = sorted(numeric_spans, key=lambda s: s["cx"])
    by_y = sorted(numeric_spans, key=lambda s: s["cy"])

    # Find the left boundary - labels whose right edge (x1) is within the first 25% of page
    left_threshold = page_width * 0.20
    bottom_threshold = page_height * 0.75

    y_labels = []  # Labels on Y axis (left side)
    x_labels = []  # Labels on X axis (bottom)

    # Group spans by their approximate x-position (for Y-axis labels)
    # and by their approximate y-position (for X-axis labels)
    for s in numeric_spans:
        # Y-axis label: on the left side of the page
        if s["x1"] < left_threshold:
            y_labels.append(s)
        # X-axis label: in the bottom portion
        elif s["cy"] > bottom_threshold:
            x_labels.append(s)

    # If we don't have enough labels on the left, try a wider threshold
    if len(y_labels) < 2:
        left_threshold = page_width * 0.30
        y_labels = [s for s in numeric_spans if s["x1"] < left_threshold]

    # If we don't have enough on the bottom, try a wider threshold
    if len(x_labels) < 2:
        bottom_threshold = page_height * 0.65
        x_labels = [s for s in numeric_spans if s["cy"] > bottom_threshold and s["x1"] > left_threshold]

    return x_labels, y_labels


def compute_pixel_bounds_from_labels(x_labels, y_labels, known_math, page_width, page_height):
    """
    Given axis labels with known values and pixel positions, compute the
    exact pixel coordinates for the mathematical bounds.
    
    Uses linear regression on 2+ reference points per axis for accuracy.
    """
    result = {
        "mathBounds": known_math.copy(),
        "pixelBounds": {}
    }

    # --- X axis: map math value to pixel X position ---
    if len(x_labels) >= 2:
        # Sort by pixel x position
        x_labels_sorted = sorted(x_labels, key=lambda s: s["cx"])
        
        # Use the leftmost and rightmost labels as reference points
        # Linear regression: pixel_x = a * math_value + b
        x1_math = x_labels_sorted[0]["value"]
        x1_pixel = x_labels_sorted[0]["cx"] * SCALE
        x2_math = x_labels_sorted[-1]["value"]
        x2_pixel = x_labels_sorted[-1]["cx"] * SCALE

        if x2_math != x1_math:
            a_x = (x2_pixel - x1_pixel) / (x2_math - x1_math)
            b_x = x1_pixel - a_x * x1_math

            # Compute pixel position for xMin and xMax
            px_xMin = a_x * known_math["xMin"] + b_x
            px_xMax = a_x * known_math["xMax"] + b_x

            result["pixelBounds"]["xMin"] = round(px_xMin, 2)
            result["pixelBounds"]["xMax"] = round(px_xMax, 2)

            # Validation: check intermediate labels
            errors = []
            for s in x_labels_sorted[1:-1]:
                predicted_px = a_x * s["value"] + b_x
                actual_px = s["cx"] * SCALE
                error = abs(predicted_px - actual_px)
                errors.append(error)
            if errors:
                avg_err = sum(errors) / len(errors)
                print(f"  X-axis fit: avg error = {avg_err:.1f}px across {len(errors)} intermediate labels")
        else:
            print(f"  WARNING: X-axis labels have same math value: {x1_math}")
    else:
        print(f"  WARNING: Only {len(x_labels)} X-axis labels found")

    # --- Y axis: map math value to pixel Y position ---
    # NOTE: In PDF/canvas, Y increases downward! So yMin (math) maps to bottom (high pixel Y)
    if len(y_labels) >= 2:
        # Sort by pixel y position (top to bottom)
        y_labels_sorted = sorted(y_labels, key=lambda s: s["cy"])

        # Top label = highest math value, bottom label = lowest math value
        # (for standard growth charts where Y increases upward)
        y_top_pixel = y_labels_sorted[0]["cy"] * SCALE
        y_top_math = y_labels_sorted[0]["value"]
        y_bot_pixel = y_labels_sorted[-1]["cy"] * SCALE
        y_bot_math = y_labels_sorted[-1]["value"]

        # Determine which is the max/min math value
        # In most charts, top = higher value, bottom = lower value
        if y_top_math < y_bot_math:
            # Inverted: top label is the min value
            y_top_math, y_bot_math = y_bot_math, y_top_math
            y_top_pixel, y_bot_pixel = y_bot_pixel, y_top_pixel

        if y_top_math != y_bot_math:
            a_y = (y_bot_pixel - y_top_pixel) / (y_bot_math - y_top_math)
            b_y = y_top_pixel - a_y * y_top_math

            # yMin (math) -> bottom of chart (high pixel Y)
            # yMax (math) -> top of chart (low pixel Y)
            px_yMin = a_y * known_math["yMin"] + b_y  # This should be large (bottom)
            px_yMax = a_y * known_math["yMax"] + b_y  # This should be small (top)

            result["pixelBounds"]["yMin"] = round(px_yMin, 2)
            result["pixelBounds"]["yMax"] = round(px_yMax, 2)

            # Validation
            errors = []
            for s in y_labels_sorted[1:-1]:
                predicted_px = a_y * s["value"] + b_y
                actual_px = s["cy"] * SCALE
                error = abs(predicted_px - actual_px)
                errors.append(error)
            if errors:
                avg_err = sum(errors) / len(errors)
                print(f"  Y-axis fit: avg error = {avg_err:.1f}px across {len(errors)} intermediate labels")
        else:
            print(f"  WARNING: Y-axis labels have same math value: {y_top_math}")
    else:
        print(f"  WARNING: Only {len(y_labels)} Y-axis labels found")

    return result


def process_cdc_dual_chart(filepath, gender):
    """
    CDC stature PDF has TWO grids: stature (top) and weight (bottom).
    Process them separately.
    """
    doc = fitz.open(filepath)
    page = doc[0]
    pw = page.rect.width
    ph = page.rect.height

    spans = extract_text_with_positions(page)
    numeric_spans = []
    for s in spans:
        text = s["text"].replace(",", "").strip()
        m = re.match(r'^-?\d+(\.\d+)?$', text)
        if m:
            numeric_spans.append({**s, "value": float(text)})

    # For CDC combined chart, we need to separate stature and weight grids
    # The page typically has two Y-axis scales on the left side
    # Stature values are in the upper portion (80-190 range)
    # Weight values are in the lower portion (10-100 range)

    # Find all Y-axis labels (left side)
    left_threshold = pw * 0.20
    y_all = [s for s in numeric_spans if s["x1"] < left_threshold]
    
    # Separate by value ranges
    y_stature = [s for s in y_all if s["value"] >= 30 and s["value"] <= 77]
    y_weight = [s for s in y_all if s["value"] >= 10 and s["value"] <= 100 and s not in y_stature]

    # X-axis labels (bottom) - shared between both grids
    bottom_threshold = ph * 0.75
    x_labels = [s for s in numeric_spans if s["cy"] > bottom_threshold and s["x1"] > left_threshold]

    results = {}

    # Process stature grid
    stature_key = f"cdc_{gender}_stature"
    stature_math = KNOWN_MATH_BOUNDS.get(stature_key)
    if stature_math and len(y_stature) >= 2 and len(x_labels) >= 2:
        results[stature_key] = compute_pixel_bounds_from_labels(
            x_labels, y_stature, stature_math, pw, ph
        )
        results[stature_key]["pdfUrl"] = f"assets/pdfs/cdc_{gender}_stature.pdf"

    # Process weight grid
    weight_key = f"cdc_{gender}_weight"
    weight_math = {"xMin": 24, "xMax": 240, "yMin": 10, "yMax": 100}
    if len(y_weight) >= 2 and len(x_labels) >= 2:
        results[weight_key] = compute_pixel_bounds_from_labels(
            x_labels, y_weight, weight_math, pw, ph
        )
        results[weight_key]["pdfUrl"] = f"assets/pdfs/cdc_{gender}_stature.pdf"

    doc.close()
    return results


def process_single_chart(filepath, chart_key, known_math):
    """Process a single-grid chart PDF."""
    doc = fitz.open(filepath)
    page = doc[0]
    pw = page.rect.width
    ph = page.rect.height

    print(f"\nProcessing: {chart_key} ({os.path.basename(filepath)})")
    print(f"  Page size: {pw:.1f} x {ph:.1f} pts")

    spans = extract_text_with_positions(page)
    x_labels, y_labels = find_axis_labels(spans, pw, ph)

    print(f"  Found {len(x_labels)} X-axis labels, {len(y_labels)} Y-axis labels")

    if len(x_labels) >= 2:
        x_vals = sorted([s["value"] for s in x_labels])
        print(f"  X values: {x_vals[:5]}...{x_vals[-3:]}" if len(x_vals) > 8 else f"  X values: {x_vals}")
    if len(y_labels) >= 2:
        y_vals = sorted([s["value"] for s in y_labels])
        print(f"  Y values: {y_vals[:5]}...{y_vals[-3:]}" if len(y_vals) > 8 else f"  Y values: {y_vals}")

    result = compute_pixel_bounds_from_labels(x_labels, y_labels, known_math, pw, ph)
    result["pdfUrl"] = f"assets/pdfs/{os.path.basename(filepath)}"

    doc.close()
    return result


def main():
    results = {}
    
    # Map chart keys to PDF filenames
    chart_pdfs = {
        "who_male_tbu":    "who_male_tbu.pdf",
        "who_female_tbu":  "who_female_tbu.pdf",
        "who_male_bbu":    "who_male_bbu.pdf",
        "who_female_bbu":  "who_female_bbu.pdf",
        "who_male_imtu":   "who_male_imtu.pdf",
        "who_female_imtu": "who_female_imtu.pdf",
        "who_male_lku":    "who_male_lku.pdf",
        "who_female_lku":  "who_female_lku.pdf",
        "who_male_bbpb":   "who_male_bbpb.pdf",
        "who_female_bbpb": "who_female_bbpb.pdf",
        "cdc_male_bmi":    "cdc_male_bmi.pdf",
        "cdc_female_bmi":  "cdc_female_bmi.pdf",
    }

    # Process single-grid charts
    for key, pdf_name in chart_pdfs.items():
        filepath = os.path.join(PDF_DIR, pdf_name)
        if not os.path.exists(filepath):
            print(f"SKIP: {filepath} not found")
            continue
        known = KNOWN_MATH_BOUNDS.get(key)
        if not known:
            print(f"SKIP: No known math bounds for {key}")
            continue
        result = process_single_chart(filepath, key, known)
        if "xMin" in result.get("pixelBounds", {}):
            results[key] = result
        else:
            print(f"  FAILED: Could not compute pixel bounds for {key}")

    # Process CDC dual-grid charts (stature + weight)
    for gender in ["male", "female"]:
        filepath = os.path.join(PDF_DIR, f"cdc_{gender}_stature.pdf")
        if os.path.exists(filepath):
            print(f"\nProcessing CDC dual chart: cdc_{gender}_stature.pdf")
            dual_results = process_cdc_dual_chart(filepath, gender)
            results.update(dual_results)

    # Output results
    print("\n" + "=" * 60)
    print("CALIBRATION RESULTS")
    print("=" * 60)

    # Generate JavaScript code
    js_lines = ["// OFFICIAL PDF CHART CALIBRATION DATA", 
                "// Auto-generated by recalibrate_precise.py",
                f"// Scale factor: {SCALE}x (must match charting.js render scale)",
                "window.OfficialChartsDB = {"]

    # Map chart keys to the format used in charting.js
    js_key_map = {
        "who_male_tbu": "who_male_stature",
        "who_female_tbu": "who_female_stature",
        "who_male_bbu": "who_male_weight",
        "who_female_bbu": "who_female_weight",
        "who_male_imtu": "who_male_imtu",
        "who_female_imtu": "who_female_imtu",
        "who_male_lku": "who_male_headcirc",
        "who_female_lku": "who_female_headcirc",
        "who_male_bbpb": "who_male_weight_length",
        "who_female_bbpb": "who_female_weight_length",
        "cdc_male_stature": "cdc_male_stature",
        "cdc_female_stature": "cdc_female_stature",
        "cdc_male_weight": "cdc_male_weight",
        "cdc_female_weight": "cdc_female_weight",
        "cdc_male_bmi": "cdc_male_bmi",
        "cdc_female_bmi": "cdc_female_bmi",
    }

    for src_key, data in sorted(results.items()):
        js_key = js_key_map.get(src_key, src_key)
        mb = data["mathBounds"]
        pb = data["pixelBounds"]
        pdf_url = data["pdfUrl"]
        
        print(f"\n{js_key}:")
        print(f"  PDF: {pdf_url}")
        print(f"  Math: x=[{mb['xMin']}, {mb['xMax']}] y=[{mb['yMin']}, {mb['yMax']}]")
        print(f"  Pixel: x=[{pb.get('xMin','?')}, {pb.get('xMax','?')}] y=[{pb.get('yMin','?')}, {pb.get('yMax','?')}]")
        
        js_lines.append(f'    "{js_key}": {{')
        js_lines.append(f'        "pdfUrl": "{pdf_url}",')
        js_lines.append(f'        "mathBounds": {{"xMin": {mb["xMin"]}, "xMax": {mb["xMax"]}, "yMin": {mb["yMin"]}, "yMax": {mb["yMax"]}}},')
        pb_str = f'{{"xMin": {pb.get("xMin", 0)}, "xMax": {pb.get("xMax", 0)}, "yMin": {pb.get("yMin", 0)}, "yMax": {pb.get("yMax", 0)}}}'
        js_lines.append(f'        "pixelBounds": {pb_str}')
        js_lines.append('    },')

    js_lines.append("};")

    # Save JSON output
    output_json = os.path.join(os.path.dirname(__file__), "calibration_precise.json")
    with open(output_json, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved JSON: {output_json}")

    # Save JS output
    output_js = os.path.join(os.path.dirname(__file__), "calibration_precise.js")
    with open(output_js, "w") as f:
        f.write("\n".join(js_lines) + "\n")
    print(f"Saved JS: {output_js}")


if __name__ == "__main__":
    main()
