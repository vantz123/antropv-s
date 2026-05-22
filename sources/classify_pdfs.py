import fitz
import os
import glob
import json

pdf_files = glob.glob('who/*.pdf') + glob.glob('cdc/*.pdf')

db = {}

def extract_pdf_info(filepath):
    try:
        doc = fitz.open(filepath)
        page = doc[0]
        text = page.get_text("text").lower()
        
        # Determine Gender
        gender = 'unknown'
        if 'boys' in text or 'laki-laki' in text: gender = 'male'
        elif 'girls' in text or 'perempuan' in text: gender = 'female'
        
        # Determine Indicator
        indicator = 'unknown'
        if 'body mass index' in text or 'bmi' in text or 'imt' in text: indicator = 'bmi'
        elif 'length-for-age' in text or 'stature-for-age' in text or 'tinggi badan' in text or 'panjang badan' in text: indicator = 'stature'
        elif 'weight-for-age' in text or 'berat badan menurut umur' in text: indicator = 'weight'
        elif 'head circumference' in text or 'lingkar kepala' in text: indicator = 'headcirc'
        elif 'weight-for-length' in text or 'berat badan menurut panjang' in text: indicator = 'weight_length'
        
        # Determine Source
        source = 'who' if 'who' in filepath.lower() else 'cdc'
        
        key = f"{source}_{gender}_{indicator}"
        
        # Find grid bounds (heuristics: get drawings, find bounding box of most lines)
        drawings = page.get_drawings()
        lines = []
        for d in drawings:
            for item in d['items']:
                if item[0] == 'l' or item[0] == 're':
                    lines.append(d['rect'])
        
        if not lines: return None
        
        # Bounding box of all lines
        x0 = min(r.x0 for r in lines)
        y0 = min(r.y0 for r in lines)
        x1 = max(r.x1 for r in lines)
        y1 = max(r.y1 for r in lines)
        
        return {
            'key': key,
            'file': filepath,
            'px': {'xMin': x0*2, 'xMax': x1*2, 'yMin': y1*2, 'yMax': y0*2} # *2 because viewport scale 2.0
        }
    except Exception as e:
        print(f"Error {filepath}: {e}")
        return None

results = {}
for f in pdf_files:
    info = extract_pdf_info(f)
    if info and info['key'] != 'who_unknown_unknown':
        print(f"Mapped {f} -> {info['key']}")
        if info['key'] not in results:
            results[info['key']] = []
        results[info['key']].append(info)

print(json.dumps(results, indent=2))
