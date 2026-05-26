import fitz

doc = fitz.open("assets/pdfs/cdc_female_stature.pdf")
page = doc[0]
words = page.get_text("words")

# Print all labels that might be weight (e.g. 10, 15, 20, 25, 30, ..., 100 or 105)
weight_candidates = []
for w in words:
    text = w[4].strip()
    if text.isdigit():
        val = int(text)
        if 10 <= val <= 110:
            # Let's see if it's near the weight grid
            # Weight grid is in the lower part of the page (usually Y between 400 and 720)
            if 450 < w[1] < 720 and w[0] < 120:
                weight_candidates.append((val, w[0], w[2], w[1], w[3]))

weight_candidates.sort(key=lambda x: (x[1], x[3]))
print("Weight candidates on the left:")
for wc in weight_candidates:
    print(f"Weight {wc[0]}: X0={wc[1]:.2f}, X1={wc[2]:.2f}, Y0={wc[3]:.2f}, Y1={wc[4]:.2f}")
