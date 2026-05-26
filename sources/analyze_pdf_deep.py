"""
Deep PDF Analysis: Extract axis structure by analyzing drawing elements.
Goal: Find the exact grid lines (horizontal & vertical) that form the chart axes.
"""
import fitz
import json
import os
import sys

PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'pdfs')
SCALE = 2.0

def analyze_pdf_deep(filepath):
    doc = fitz.open(filepath)
    page = doc[0]
    pw = page.rect.width
    ph = page.rect.height
    
    print(f"\n{'='*60}")
    print(f"File: {os.path.basename(filepath)}")
    print(f"Page: {pw:.1f} x {ph:.1f} pts")
    
    # Get all drawings
    drawings = page.get_drawings()
    
    # Collect all line segments
    h_lines = []  # horizontal lines
    v_lines = []  # vertical lines
    
    for d in drawings:
        for item in d['items']:
            if item[0] == 'l':  # line element
                p1, p2 = item[1], item[2]
                x1, y1 = p1.x, p1.y
                x2, y2 = p2.x, p2.y
                length = ((x2-x1)**2 + (y2-y1)**2)**0.5
                
                # Horizontal line (y coords same)
                if abs(y2 - y1) < 0.5 and length > 20:
                    h_lines.append({
                        'y': (y1+y2)/2, 'x_start': min(x1,x2), 'x_end': max(x1,x2),
                        'length': length, 'color': d.get('color', None)
                    })
                # Vertical line
                elif abs(x2 - x1) < 0.5 and length > 20:
                    v_lines.append({
                        'x': (x1+x2)/2, 'y_start': min(y1,y2), 'y_end': max(y1,y2),
                        'length': length, 'color': d.get('color', None)
                    })
    
    print(f"\nFound {len(h_lines)} horizontal lines, {len(v_lines)} vertical lines")
    
    # Find the MAIN horizontal axis lines (spanning most of chart width)
    # Sort by length to find the longest ones
    h_lines.sort(key=lambda l: l['length'], reverse=True)
    v_lines.sort(key=lambda l: l['length'], reverse=True)
    
    # Find the main grid boundary
    # The chart grid is formed by: leftmost long vertical line, rightmost long vertical line,
    # topmost long horizontal line, bottommost long horizontal line
    
    # Filter for truly long lines (>30% of page dimension)
    long_h = [l for l in h_lines if l['length'] > pw * 0.3]
    long_v = [l for l in v_lines if l['length'] > ph * 0.3]
    
    if long_h:
        h_ys = sorted(set([round(l['y'], 1) for l in long_h]))
        print(f"\nLong horizontal lines at Y: {h_ys}")
        grid_top = min(h_ys)  # Topmost = y-axis max
        grid_bottom = max(h_ys)  # Bottommost = y-axis min
        grid_left = min(l['x_start'] for l in long_h)
        grid_right = max(l['x_end'] for l in long_h)
        print(f"Grid H bounds: top_y={grid_top:.1f}, bottom_y={grid_bottom:.1f}")
        print(f"Grid H x-span: {grid_left:.1f} to {grid_right:.1f}")
    
    if long_v:
        v_xs = sorted(set([round(l['x'], 1) for l in long_v]))
        print(f"\nLong vertical lines at X: {v_xs}")
        grid_left_v = min(v_xs)  # Leftmost = x-axis min
        grid_right_v = max(v_xs)  # Rightmost = x-axis max
        grid_top_v = min(l['y_start'] for l in long_v)
        grid_bottom_v = max(l['y_end'] for l in long_v)
        print(f"Grid V bounds: left_x={grid_left_v:.1f}, right_x={grid_right_v:.1f}")
        print(f"Grid V y-span: {grid_top_v:.1f} to {grid_bottom_v:.1f}")
    
    # Now extract text and correlate with grid positions
    text_dict = page.get_text("dict")
    all_spans = []
    for block in text_dict.get("blocks", []):
        if block.get("type") == 0:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span["text"].strip()
                    if text:
                        bbox = span["bbox"]
                        all_spans.append({
                            "text": text,
                            "x0": bbox[0], "y0": bbox[1],
                            "x1": bbox[2], "y1": bbox[3],
                            "cx": (bbox[0]+bbox[2])/2,
                            "cy": (bbox[1]+bbox[3])/2,
                            "size": span.get("size", 0),
                        })
    
    # Print text near the grid boundaries for analysis
    if long_v:
        left_x = grid_left_v
        right_x = grid_right_v
    elif long_h:
        left_x = grid_left
        right_x = grid_right
    else:
        left_x, right_x = 0, pw
    
    if long_h:
        top_y = grid_top if long_h else 0
        bottom_y = grid_bottom if long_h else ph
    else:
        top_y, bottom_y = 0, ph
    
    # Y-axis labels: text to the LEFT of the grid
    y_axis_texts = [s for s in all_spans if s['x1'] < left_x + 5 and top_y - 10 <= s['cy'] <= bottom_y + 10]
    y_axis_texts.sort(key=lambda s: s['cy'])
    
    print(f"\n--- Y-axis text labels ({len(y_axis_texts)}) ---")
    for s in y_axis_texts[:30]:
        print(f"  '{s['text']}' at y={s['cy']:.1f} (x={s['cx']:.1f}, size={s['size']:.1f})")
    
    # X-axis labels: text BELOW the grid
    x_axis_texts = [s for s in all_spans if s['cy'] > bottom_y - 5 and left_x - 10 <= s['cx'] <= right_x + 10]
    x_axis_texts.sort(key=lambda s: s['cx'])
    
    print(f"\n--- X-axis text labels ({len(x_axis_texts)}) ---")
    for s in x_axis_texts[:30]:
        print(f"  '{s['text']}' at x={s['cx']:.1f} (y={s['cy']:.1f}, size={s['size']:.1f})")
    
    # Right Y-axis labels (some charts have labels on the right too)
    right_y_texts = [s for s in all_spans if s['x0'] > right_x - 5 and top_y - 10 <= s['cy'] <= bottom_y + 10]
    right_y_texts.sort(key=lambda s: s['cy'])
    if right_y_texts:
        print(f"\n--- Right Y-axis text labels ({len(right_y_texts)}) ---")
        for s in right_y_texts[:20]:
            print(f"  '{s['text']}' at y={s['cy']:.1f} (x={s['cx']:.1f})")
    
    # Summary for calibration
    if long_v and long_h:
        print(f"\n*** GRID BOUNDS (PDF pts) ***")
        print(f"  Left edge (xMin):   x = {grid_left_v:.2f}")
        print(f"  Right edge (xMax):  x = {grid_right_v:.2f}")
        print(f"  Top edge (yMax):    y = {grid_top:.2f}")
        print(f"  Bottom edge (yMin): y = {grid_bottom:.2f}")
        print(f"\n*** PIXEL BOUNDS (at scale {SCALE}x) ***")
        print(f"  xMin pixel: {grid_left_v * SCALE:.2f}")
        print(f"  xMax pixel: {grid_right_v * SCALE:.2f}")
        print(f"  yMin pixel (bottom): {grid_bottom * SCALE:.2f}")
        print(f"  yMax pixel (top):    {grid_top * SCALE:.2f}")
    
    doc.close()
    return {
        'h_grid_top': grid_top if long_h else None,
        'h_grid_bottom': grid_bottom if long_h else None,
        'v_grid_left': grid_left_v if long_v else None,
        'v_grid_right': grid_right_v if long_v else None,
    }


# Process key PDFs
for pdf_name in [
    "who_male_tbu.pdf", "who_female_bbu.pdf",
    "who_male_lku.pdf", "who_male_bbpb.pdf",
    "cdc_male_stature.pdf", "cdc_male_bmi.pdf"
]:
    fp = os.path.join(PDF_DIR, pdf_name)
    if os.path.exists(fp):
        analyze_pdf_deep(fp)
