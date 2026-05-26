import fitz, os
fp = os.path.join('assets', 'pdfs', 'cdc_male_stature.pdf')
doc = fitz.open(fp)
page = doc[0]
for block in page.get_text('dict').get('blocks', []):
    if block.get('type') == 0:
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                text = span['text'].strip()
                bbox = span['bbox']
                cy = (bbox[1]+bbox[3])/2
                if text.isdigit() and int(text) >= 70 and int(text) <= 200:
                    print(f'LABEL "{text}" at x={bbox[0]:.1f} y={cy:.1f}')
doc.close()
