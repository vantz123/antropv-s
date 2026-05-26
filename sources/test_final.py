import fitz
import json

# Data from our official-charts-calibration.js
WHO_TBU = {
    "mathBounds": {"xMin": 0, "xMax": 60, "yMin": 45, "yMax": 125},
    "pixelBounds": {"xMin": 113.4, "xMax": 1570.4, "yMin": 1094.0, "yMax": 157.0}
}
CDC_STATURE = {
    "mathBounds": {"xMin": 24, "xMax": 240, "yMin": 80, "yMax": 190},
    "pixelBounds": {"xMin": 164.0, "xMax": 1045.4, "yMin": 1124.9, "yMax": 238.8}
}

def get_coords(math, px, x_val, y_val):
    xRatio = (x_val - math["xMin"]) / (math["xMax"] - math["xMin"])
    yRatio = (y_val - math["yMin"]) / (math["yMax"] - math["yMin"])
    # The y pixel ratio needs to go from yMin (bottom, high pixel value) to yMax (top, low pixel value)
    pixelX = px["xMin"] + xRatio * (px["xMax"] - px["xMin"])
    pixelY = px["yMin"] + yRatio * (px["yMax"] - px["yMin"])
    return pixelX / 2.0, pixelY / 2.0 # Divide by 2 because our pixels are scale=2.0, but PyMuPDF uses scale=1.0

def plot_point(doc, page, x, y, label, color=(1,0,0)):
    rect = fitz.Rect(x - 3, y - 3, x + 3, y + 3)
    shape = page.new_shape()
    shape.draw_rect(rect)
    shape.finish(color=color, fill=color)
    shape.insert_text(fitz.Point(x + 5, y - 5), label, fontsize=10, color=color)
    shape.commit()

# TEST 1: WHO TBU (Male 24 months, 87.1 cm - exactly 50th percentile)
doc1 = fitz.open("assets/pdfs/who_male_tbu.pdf")
page1 = doc1[0]
x_who, y_who = get_coords(WHO_TBU["mathBounds"], WHO_TBU["pixelBounds"], 24, 87.1)
plot_point(doc1, page1, x_who, y_who, "24mo, 87.1cm (WHO 50th)")
doc1.save("test_who_final.pdf")

# TEST 2: CDC Stature (Male 84 months (7y), 121.9 cm - exactly 50th percentile)
doc2 = fitz.open("assets/pdfs/cdc_male_stature.pdf")
page2 = doc2[0]
x_cdc, y_cdc = get_coords(CDC_STATURE["mathBounds"], CDC_STATURE["pixelBounds"], 84, 121.9)
plot_point(doc2, page2, x_cdc, y_cdc, "84mo, 121.9cm (CDC 50th)")
doc2.save("test_cdc_final.pdf")

print("Generated test_who_final.pdf and test_cdc_final.pdf")
