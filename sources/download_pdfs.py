import urllib.request
import os

pdf_urls = {
    'who_male_tbu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/zha_boys_z_0_5.pdf',
    'who_female_tbu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/zha_girls_z_0_5.pdf',
    'who_male_bbu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/zwa_boys_z_0_5.pdf',
    'who_female_bbu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/zwa_girls_z_0_5.pdf',
    'who_male_imtu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/bmi-for-age/zba_boys_z_0_5.pdf',
    'who_female_imtu': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/bmi-for-age/zba_girls_z_0_5.pdf',
    'who_male_bbpb': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length/zwfl_boys_z_0_2.pdf',
    'who_female_bbpb': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length/zwfl_girls_z_0_2.pdf',
    'who_male_lku': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/zhca_boys_z_0_5.pdf',
    'who_female_lku': 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/zhca_girls_z_0_5.pdf'
}

os.makedirs('assets/pdfs', exist_ok=True)
success = 0
for name, url in pdf_urls.items():
    if os.path.exists(f'assets/pdfs/{name}.pdf'): continue
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as response, open(f'assets/pdfs/{name}.pdf', 'wb') as out_file:
            out_file.write(response.read())
        print(f"Downloaded {name}.pdf")
        success += 1
    except Exception as e:
        print(f"Failed {name}.pdf: {e}")

print(f"Total downloaded: {success}")
