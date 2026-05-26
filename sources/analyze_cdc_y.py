import fitz

doc = fitz.open("assets/pdfs/cdc_female_stature.pdf")
page = doc[0]
words = page.get_text("words")

# Find stature labels on the left:
print("Left stature labels:")
left_stature = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[0] < 100:
        val = int(text)
        if 80 <= val <= 160:
            left_stature.append((val, w[1], w[3]))
left_stature.sort(key=lambda x: x[0])
for ls in left_stature:
    print(f"Stature {ls[0]}: Y0={ls[1]:.2f}, Y1={ls[2]:.2f}")

# Find stature labels on the right (ages 12-20, stature 150-190):
print("\nRight stature labels:")
right_stature = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and w[0] > 500:
        val = int(text)
        if 150 <= val <= 190:
            right_stature.append((val, w[1], w[3]))
right_stature.sort(key=lambda x: x[0])
for rs in right_stature:
    print(f"Stature {rs[0]}: Y0={rs[1]:.2f}, Y1={rs[2]:.2f}")

# Find weight labels on the left:
print("\nWeight labels (kg):")
weight_labels = []
for w in words:
    text = w[4].strip()
    if text.isdigit() and 100 < w[0] < 130:
        val = int(text)
        if 10 <= val <= 105:
            weight_labels.append((val, w[1], w[3]))
weight_labels.sort(key=lambda x: x[0])
for wl in weight_labels:
    print(f"Weight {wl[0]}: Y0={wl[1]:.2f}, Y1={wl[2]:.2f}")
