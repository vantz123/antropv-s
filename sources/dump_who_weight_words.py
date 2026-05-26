import fitz

doc = fitz.open("assets/pdfs/who_female_bbu.pdf")
page = doc[0]
words = page.get_text("words")

print("WHO Weight words with X < 100:")
for w in words[:150]:
    if w[0] < 100:
        print(f"Text '{w[4]}' at X0={w[0]:.2f}, Y0={w[1]:.2f}")
