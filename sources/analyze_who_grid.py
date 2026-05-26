import fitz

doc = fitz.open("assets/pdfs/who_male_bbu.pdf")
page = doc[0]

# Find horizontal lines (Y grid lines)
lines = []
for p in page.get_drawings():
    for item in p["items"]:
        if item[0] == "l":
            p1, p2 = item[1], item[2]
            if abs(p1.y - p2.y) < 1.0: # Horizontal line
                lines.append(p1.y)

lines = sorted(list(set([round(y, 1) for y in lines])))
print("Horizontal lines Y coords:")
print(lines)

# Find text to map to these lines
words = page.get_text("words")
print("\nWords on left axis:")
for w in words:
    if w[0] < 100: # Left side
        print(f"Text: '{w[4]}' at Y: {w[1]:.1f} - {w[3]:.1f}")
