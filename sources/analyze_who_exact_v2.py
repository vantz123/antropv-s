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
    
    if len(h_lines) == 0:
        continue
        
    y_bottom_grid = max(h_lines)
    y_top_grid = min(h_lines)
    
    words = page.get_text("words")
    
    # Extract left Y-axis labels
    # Y-axis labels are typically to the left of the left-most grid line.
    left_grid_x = min(v_lines)
    
    y_labels = []
    for w in words:
        if w[2] < left_grid_x: # entirely to the left of the grid
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
        # However, the bounding box should be the entire grid, not just the labelled points!
        # min_val corresponds to min_y (which is a high pixel value, towards bottom)
        # max_val corresponds to max_y (which is a low pixel value, towards top)
        
        # Calculate units per pixel
        dy = max_y - min_y
        dval = max_val - min_val
        val_per_pixel = dval / dy
        
        # Extrapolate to top and bottom grid lines
        # math_min is the math value at y_bottom_grid (highest pixel Y)
        math_min = min_val + (y_bottom_grid - min_y) * val_per_pixel
        # math_max is the math value at y_top_grid (lowest pixel Y)
        math_max = max_val + (y_top_grid - max_y) * val_per_pixel
        
        results[pdf_file] = {
            "mathBounds": {
                "xMin": 0, "xMax": 60, # We assume WHO charts are 0 to 60 (except weight_length!)
                "yMin": round(math_min, 1), "yMax": round(math_max, 1)
            },
            "pixelBounds": {
                "xMin": round(min(v_lines) * 2, 1), 
                "xMax": round(max(v_lines) * 2, 1),
                "yMin": round(y_bottom_grid * 2, 1), 
                "yMax": round(y_top_grid * 2, 1)
            }
        }
        
        # Check weight_length x bounds
        if "bbpb" in pdf_file:
            results[pdf_file]["mathBounds"]["xMin"] = 45
            results[pdf_file]["mathBounds"]["xMax"] = 110

with open("who_bounds_exact_v2.json", "w") as f:
    json.dump(results, f, indent=4)
print("Finished.")
