import fitz

doc = fitz.open("assets/pdfs/cdc_female_bmi.pdf")
page = doc[0]

vertical_lines = []
for draw in page.get_drawings():
    for item in draw["items"]:
        if item[0] == "l":
            p1, p2 = item[1], item[2]
            if abs(p1.x - p2.x) < 0.5 and abs(p1.y - p2.y) > 100:
                vertical_lines.append((p1.x, min(p1.y, p2.y), max(p1.y, p2.y)))

unique_x = sorted(list(set([round(vl[0], 1) for vl in vertical_lines])))
print(f"Total unique vertical line X coordinates: {len(unique_x)}")
print("First 10 unique X:", unique_x[:10])
print("Last 10 unique X:", unique_x[-10:])
