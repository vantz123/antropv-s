import fitz

doc = fitz.open("assets/pdfs/who_female_lku.pdf")
page = doc[0]
words = page.get_text("words")

print(f"LKU Size: {page.rect.width} x {page.rect.height}")

# Find age labels at the bottom (Y > 500)
age_words = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[1] > page.rect.height - 80:
        val = int(text)
        if 0 <= val <= 5:
            age_words.append((val, w[0], w[2], w[1], w[3]))

age_words.sort(key=lambda x: x[0])
print("LKU X labels:")
for aw in age_words:
    print(f"Age {aw[0]}: X0={aw[1]:.2f}, X1={aw[2]:.2f}, Y0={aw[3]:.2f}, Y1={aw[4]:.2f}")

# Find headcirc labels on the left (X < 150)
hc_words = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[0] < 150:
        val = int(text)
        if 30 <= val <= 55:
            hc_words.append((val, w[0], w[2], w[1], w[3]))

hc_words.sort(key=lambda x: (x[1], x[3]))
print("\nLKU Y labels:")
for hw in hc_words:
    print(f"HC {hw[0]}: X0={hw[1]:.2f}, X1={hw[2]:.2f}, Y0={hw[3]:.2f}, Y1={hw[4]:.2f}")
