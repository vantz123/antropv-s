import fitz
import glob
import json
import re
import math

pdf_files = glob.glob('../assets/pdfs/*.pdf')
results = {}

for filepath in pdf_files:
    try:
        doc = fitz.open(filepath)
        page = doc[0]
        
        # 1. Find grid bounds (largest bounding box of horizontal/vertical lines)
        drawings = page.get_drawings()
        lines = []
        for d in drawings:
            for item in d['items']:
                if item[0] == 'l' or item[0] == 're':
                    lines.append(d['rect'])
        
        if not lines: continue
        
        x0 = min(r.x0 for r in lines)
        y0 = min(r.y0 for r in lines)
        x1 = max(r.x1 for r in lines)
        y1 = max(r.y1 for r in lines)
        
        # To ignore tiny borders, let's find the bounding box of lines that span at least 20% of the page
        w = page.rect.width
        h = page.rect.height
        long_lines = [r for r in lines if r.width > w*0.2 or r.height > h*0.2]
        if long_lines:
            gx0 = min(r.x0 for r in long_lines)
            gy0 = min(r.y0 for r in long_lines)
            gx1 = max(r.x1 for r in long_lines)
            gy1 = max(r.y1 for r in long_lines)
        else:
            gx0, gy0, gx1, gy1 = x0, y0, x1, y1

        # 2. Find Math Bounds from Text nearby
        text_dict = page.get_text("dict")
        blocks = text_dict.get("blocks", [])
        
        y_labels = []
        x_labels = []
        
        for b in blocks:
            if b.get('type') == 0:
                for l in b.get('lines', []):
                    for s in l.get('spans', []):
                        text = s['text'].strip()
                        # check if text is a number
                        if re.match(r'^\d+(\.\d+)?$', text):
                            val = float(text)
                            bbox = s['bbox']
                            cx = (bbox[0] + bbox[2]) / 2
                            cy = (bbox[1] + bbox[3]) / 2
                            
                            # if it's near the left edge of grid, it's a Y label
                            if abs(bbox[2] - gx0) < 30 and gy0 <= cy <= gy1:
                                y_labels.append({'val': val, 'y': cy})
                            
                            # if it's near the bottom edge of grid, it's an X label
                            if abs(bbox[1] - gy1) < 40 and gx0 <= cx <= gx1:
                                x_labels.append({'val': val, 'x': cx})

        mathBounds = {'xMin': 0, 'xMax': 0, 'yMin': 0, 'yMax': 0}
        
        if y_labels:
            y_labels.sort(key=lambda item: item['y']) # top to bottom
            # top is max y, bottom is min y
            yMax = y_labels[0]['val']
            yMin = y_labels[-1]['val']
            # adjust if they are inverted
            if yMax < yMin: yMax, yMin = yMin, yMax
            mathBounds['yMin'] = yMin
            mathBounds['yMax'] = yMax
            
        if x_labels:
            x_labels.sort(key=lambda item: item['x']) # left to right
            xMin = x_labels[0]['val']
            xMax = x_labels[-1]['val']
            if xMax < xMin: xMax, xMin = xMin, xMax
            mathBounds['xMin'] = xMin
            mathBounds['xMax'] = xMax

        key = filepath.replace('\\', '/').split('/')[-1].replace('.pdf', '')
        
        results[key] = {
            'pdfUrl': f'assets/pdfs/{key}.pdf',
            'mathBounds': mathBounds,
            'pixelBounds': {
                'xMin': round(gx0 * 2),
                'xMax': round(gx1 * 2),
                'yMin': round(gy1 * 2), # Bottom of grid is max Y in pixel space
                'yMax': round(gy0 * 2)  # Top of grid is min Y in pixel space
            }
        }
    except Exception as e:
        print(f"Error {filepath}: {e}")

with open('calibration_output.json', 'w') as f:
    json.dump(results, f, indent=2)

print("Generated calibration_output.json")
