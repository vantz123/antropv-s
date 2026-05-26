import fitz

def check_who(pdf_path, name):
    print(f"=== {name} ===")
    doc = fitz.open(pdf_path)
    page = doc[0]
    words = page.get_text("words")
    
    # Print width and height of page
    print(f"Size: {page.rect.width} x {page.rect.height}")
    
    # Find Y axis text labels (e.g. 50, 60, 70, 80, 90, 100, 110, 120 for stature)
    y_labels = []
    for w in words:
        text = w[4].strip()
        # Find numeric labels on the far left (X < 100)
        if text.replace('.', '', 1).isdigit() and w[0] < 80:
            val = float(text)
            y_labels.append((val, w[1], w[3]))
            
    y_labels.sort(key=lambda x: x[0])
    print("Y-axis Labels:")
    for yl in y_labels:
        print(f"  Value {yl[0]}: Y0={yl[1]:.2f}, Y1={yl[2]:.2f}")
        
    # Find X axis labels (e.g. 0, 1, 2, 3, 4, 5 years or months at the bottom)
    x_labels = []
    for w in words:
        text = w[4].strip()
        if text.isdigit() and w[1] > page.rect.height - 80:
            val = int(text)
            x_labels.append((val, w[0], w[2]))
            
    x_labels.sort(key=lambda x: x[0])
    print("X-axis Labels:")
    for xl in x_labels:
        print(f"  Value {xl[0]}: X0={xl[1]:.2f}, X1={xl[2]:.2f}")

check_who("assets/pdfs/who_female_tbu.pdf", "WHO Female Stature")
check_who("assets/pdfs/who_female_bbu.pdf", "WHO Female Weight")
