import fitz

doc = fitz.open("assets/pdfs/cdc_female_stature.pdf")
page = doc[0]
words = page.get_text("words")

# Find weight labels on the right (X > 450)
right_weight = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[0] > 450:
        val = int(text)
        if 30 <= val <= 110:
            right_weight.append((val, w[0], w[2], w[1], w[3]))

right_weight.sort(key=lambda x: x[0])
print("Right weight labels:")
for rw in right_weight:
    print(f"Weight {rw[0]}: X0={rw[1]:.2f}, X1={rw[2]:.2f}, Y0={rw[3]:.2f}, Y1={rw[4]:.2f}")
