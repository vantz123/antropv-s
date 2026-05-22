import zlib
import re

def extract_streams(pdf_path):
    with open(pdf_path, 'rb') as f:
        data = f.read()
    
    # Find all streams
    stream_pattern = re.compile(rb'stream\r?\n(.*?)\r?\nendstream', re.DOTALL)
    streams = stream_pattern.findall(data)
    
    out_text = ""
    for idx, s in enumerate(streams):
        try:
            decompressed = zlib.decompress(s)
            out_text += f"\n--- STREAM {idx} ---\n"
            out_text += decompressed.decode('latin-1', errors='ignore')
        except:
            pass
            
    with open('pdf_dump.txt', 'w', encoding='utf-8') as f:
        f.write(out_text)

extract_streams('cdc_bmi_boys_2_20.pdf')
