import fitz
import json

doc = fitz.open("assets/pdfs/cdc_female_stature.pdf")
page = doc[0]

# Let's find all text elements representing ages 2, 3, 4, ..., 20 at the bottom
# and their X coordinates.
words = page.get_text("words")
# Filter words that are numbers between 2 and 20 and are near the bottom of the page (Y > 700)
age_words = []
for w in words:
    # w is (x0, y0, x1, y1, text, block_no, line_no, word_no)
    text = w[4].strip()
    if text.isdigit():
        val = int(text)
        if 2 <= val <= 20 and w[1] > 700:
            age_words.append((val, w[0], w[2], w[1], w[3]))

age_words.sort(key=lambda x: x[0])
print("Age labels at the bottom:")
for aw in age_words:
    print(f"Age {aw[0]}: X0={aw[1]:.2f}, X1={aw[2]:.2f}, Y0={aw[3]:.2f}, Y1={aw[4]:.2f}")

# Let's also find vertical lines
vertical_lines = []
for draw in page.get_drawings():
    for item in draw["items"]:
        if item[0] == "l":
            p1, p2 = item[1], item[2]
            # vertical line: x1 approx x2, y1 != y2
            if abs(p1.x - p2.x) < 0.5 and abs(p1.y - p2.y) > 100:
                vertical_lines.append((p1.x, min(p1.y, p2.y), max(p1.y, p2.y)))

# Find unique X coordinates of vertical lines
unique_x = sorted(list(set([round(vl[0], 1) for vl in vertical_lines])))
print(f"Total unique vertical line X coordinates: {len(unique_x)}")
print("First 10 unique X:", unique_x[:10])
print("Last 10 unique X:", unique_x[-10:])
