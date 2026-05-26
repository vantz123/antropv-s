import fitz

doc = fitz.open("assets/pdfs/cdc_female_bmi.pdf")
page = doc[0]
words = page.get_text("words")

# Find age labels at the bottom (Y > 700)
age_words = []
for w in words:
    text = w[4].strip()
    if text.isdigit():
        val = int(text)
        if 2 <= val <= 20 and w[1] > 700:
            age_words.append((val, w[0], w[2], w[1], w[3]))

age_words.sort(key=lambda x: x[0])
print("BMI Age labels:")
for aw in age_words:
    print(f"Age {aw[0]}: X0={aw[1]:.2f}, X1={aw[2]:.2f}, Y0={aw[3]:.2f}, Y1={aw[4]:.2f}")

# Find BMI labels on the left (X < 120)
bmi_words = []
for w in words:
    text = w[4].strip()
    if text.isdigit():
        val = int(text)
        if 10 <= val <= 40 and w[0] < 125:
            bmi_words.append((val, w[0], w[2], w[1], w[3]))

bmi_words.sort(key=lambda x: (x[1], x[3]))
print("\nBMI labels on the left:")
for bw in bmi_words:
    print(f"BMI {bw[0]}: X0={bw[1]:.2f}, X1={bw[2]:.2f}, Y0={bw[3]:.2f}, Y1={bw[4]:.2f}")
