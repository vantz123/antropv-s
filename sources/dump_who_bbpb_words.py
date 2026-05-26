import fitz

doc = fitz.open("assets/pdfs/who_female_bbpb.pdf")
page = doc[0]
words = page.get_text("words")

print("WHO BBPB words with X < 120:")
for w in words[:150]:
    if w[0] < 120:
        print(f"Text '{w[4]}' at X0={w[0]:.2f}, Y0={w[1]:.2f}")
        
print("\nWHO BBPB words at the bottom (Y > 500):")
for w in words:
    if w[1] > page.rect.height - 80:
        print(f"Text '{w[4]}' at X0={w[0]:.2f}, Y0={w[1]:.2f}")
