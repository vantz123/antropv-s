import re

file_path = "styles.css"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    r"rgba\(\s*79\s*,\s*70\s*,\s*229": "rgba(2, 132, 199",
    r"rgba\(\s*124\s*,\s*58\s*,\s*237": "rgba(14, 165, 233",
    r"#4f46e5": "#0284c7",
    r"#7c3aed": "#0ea5e9",
    r"#312e81": "#075985",
    r"#1e1b4b": "#0c4a6e"
}

for old, new in replacements.items():
    content = re.sub(old, new, content, flags=re.IGNORECASE)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced all purple occurrences in styles.css")
