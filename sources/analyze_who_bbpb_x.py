import fitz

doc = fitz.open("assets/pdfs/who_female_bbpb.pdf")
page = doc[0]
words = page.get_text("words")

length_words = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[1] > 490 and w[1] < 520:
        val = int(text)
        if 45 <= val <= 115:
            length_words.append((val, w[0], w[2]))

length_words.sort(key=lambda x: x[0])
print("WHO Weight-for-Length X labels:")
for lw in length_words:
    print(f"  Length {lw[0]}: X0={lw[1]:.2f}, X1={lw[2]:.2f}")
