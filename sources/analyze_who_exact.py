import fitz
import json
import os

pdf_folder = "assets/pdfs"
pdfs = [f for f in os.listdir(pdf_folder) if f.endswith('.pdf') and 'who' in f]

results = {}

for pdf_file in pdfs:
    doc = fitz.open(os.path.join(pdf_folder, pdf_file))
    page = doc[0]
    
    h_lines = []
    v_lines = []
    for p in page.get_drawings():
        for item in p["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1.0: h_lines.append(p1.y)
                if abs(p1.x - p2.x) < 1.0: v_lines.append(p1.x)
                    
    h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
    v_lines = sorted(list(set([round(x, 1) for x in v_lines])))
    
    words = page.get_text("words")
    
    # Extract left Y-axis labels (numeric values)
    y_labels = []
    for w in words:
        if w[0] < 150: # left area
            try:
                val = float(w[4])
                y_labels.append({"val": val, "y_center": (w[1] + w[3])/2.0})
            except:
                pass
                
    if len(y_labels) < 2:
        continue
        
    # Match labels to nearest h_line
    mapped_lines = []
    for lbl in y_labels:
        # find closest h_line
        closest_line = min(h_lines, key=lambda y: abs(y - lbl["y_center"]))
        if abs(closest_line - lbl["y_center"]) < 10.0:
            mapped_lines.append((lbl["val"], closest_line))
            
    if len(mapped_lines) >= 2:
        mapped_lines.sort(key=lambda x: x[0])
        min_val, min_y = mapped_lines[0]
        max_val, max_y = mapped_lines[-1]
        
        # Calculate pixels (scale 2.0)
        results[pdf_file] = {
            "mathBounds": {
                "xMin": 0, "xMax": 60,
                "yMin": min_val, "yMax": max_val
            },
            "pixelBounds": {
                "xMin": round(min(v_lines) * 2, 1), 
                "xMax": round(max(v_lines) * 2, 1),
                "yMin": round(min_y * 2, 1), 
                "yMax": round(max_y * 2, 1)
            }
        }
        print(f"{pdf_file}: math yMin={min_val}, yMax={max_val} -> px yMin={results[pdf_file]['pixelBounds']['yMin']}, yMax={results[pdf_file]['pixelBounds']['yMax']}")

with open("who_bounds_exact.json", "w") as f:
    json.dump(results, f, indent=4)
