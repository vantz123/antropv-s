import fitz
import json
import os

pdf_folder = "assets/pdfs"
pdfs = [f for f in os.listdir(pdf_folder) if f.endswith('.pdf')]

results = {}

for pdf_file in pdfs:
    doc = fitz.open(os.path.join(pdf_folder, pdf_file))
    page = doc[0]
    
    # 1. Find the horizontal grid lines
    h_lines = []
    # 2. Find the vertical grid lines
    v_lines = []
    
    for p in page.get_drawings():
        for item in p["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1.0: # Horizontal
                    h_lines.append(p1.y)
                if abs(p1.x - p2.x) < 1.0: # Vertical
                    v_lines.append(p1.x)
                    
    h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
    v_lines = sorted(list(set([round(x, 1) for x in v_lines])))
    
    if len(h_lines) == 0 or len(v_lines) == 0:
        print(f"Skipping {pdf_file}, no grid found.")
        continue
        
    # WHO vs CDC structure
    # WHO charts usually have one main grid. 
    # CDC stature/weight charts have two grids (stature on top, weight on bottom).
    
    # We can rely on the outermost grid lines.
    # The lowest y (top of page) is yMax in our logic (e.g. Y=125 or Y=28)
    # The highest y (bottom of page) is yMin in our logic (e.g. Y=45 or Y=2)
    
    if "cdc" in pdf_file and ("stature" in pdf_file or "weight" in pdf_file):
        # CDC Stature + Weight combined PDF
        # We know from earlier that stature is the top grid, weight is the bottom grid.
        # Top grid (stature) Y bounds: ~119 to ~562
        # Bottom grid (weight) Y bounds: ~341 to ~703
        
        # Let's get the absolute min and max of all h_lines
        pass # We already manually verified CDC combined charts
    
    # For WHO charts, there is just one grid.
    if "who" in pdf_file:
        y_top = min(h_lines)
        y_bottom = max(h_lines)
        x_left = min(v_lines)
        x_right = max(v_lines)
        
        results[pdf_file] = {
            "xMin": round(x_left * 2, 1),
            "xMax": round(x_right * 2, 1),
            "yMin": round(y_bottom * 2, 1), # bottom (highest pixel Y)
            "yMax": round(y_top * 2, 1)     # top (lowest pixel Y)
        }
        print(f"{pdf_file}: {results[pdf_file]}")

with open("who_bounds.json", "w") as f:
    json.dump(results, f, indent=4)
