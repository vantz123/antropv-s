import xlrd
import os
import json

excel_files = {
    'Weight-for-Age': 'wtageinf.xls',
    'Length-for-Age': 'lenageinf.xls',
}

results = {}

for name, filename in excel_files.items():
    fp = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(fp):
        book = xlrd.open_workbook(fp)
        sheet = book.sheet_by_index(0)
        
        headers = [str(sheet.cell_value(0, c)).strip() for c in range(sheet.ncols)]
        
        data = []
        for r in range(1, 4):
            row_data = {}
            for c in range(sheet.ncols):
                row_data[headers[c]] = sheet.cell_value(r, c)
            data.append(row_data)
            
        results[name] = {
            'headers': headers,
            'data': data
        }

print(json.dumps(results, indent=2))
