# Antropometri Master v11 — WHO/CDC Split + Klinis IDAI Final

Build final yang menggabungkan arsitektur split WHO/CDC (v10) dengan tabel klinis IDAI (v6) dan jangkauan CDC penuh 2-20 tahun.

## Mode Kalkulasi
| Mode | Perilaku |
|------|----------|
| **Auto Split** (default) | WHO untuk 0-5 tahun (gold standard); CDC untuk >5 sampai 20 tahun. BBI/WA memakai tabel klinis IDAI bila tersedia, fallback ke WHO/CDC. Jika WHO tidak menyediakan data (HA > 120 bulan), CDC otomatis dipakai. |
| **WHO Only — Strict** | Jalur WHO murni tanpa fallback ke CDC. WA dibatasi sampai 120 bulan. BBI dikosongkan bila HA > 120 bulan (audit klinis murni WHO). |
| **WHO Only — Extended App** | Jalur WHO murni; bila HA > 120 bulan, BBI dihitung via fallback aplikasi: median BMI/U × TB². |
| **CDC Only** | Jalur CDC murni untuk WA, HA, dan BBI (referensi 2-20 tahun). |

## Cakupan Data Referensi
- **WHO 2006** (BB/U, TB/U, BB/PB-TB, IMT/U, LK/U): 0-60 bulan.
- **WHO 2007** (HFA, WFA 5-10, BFA): 5-19 tahun.
- **WHO BB/PB-TB**: 45-110 cm (data resmi WHO 2006).
- **CDC 2000** (Stature/Weight/BMI for Age): **24-240 bulan** (2-20 tahun).
- **Tabel BBI Klinis IDAI**: 0-228 bulan (lookup berbasis HA).
- **Tabel WA Klinis IDAI**: 0-63 kg (lookup berbasis BB).

## Status QA (5 run berturut-turut stabil)
- `qa_simplified.js` (UI/RDA/chart) → **27/27 PASS**
- `qa_split_matrix.js` (mode WHO/CDC split) → **23/23 PASS**
- `qa_training_v2.js` (dataset klinis nyata, 32 pasien) → **183/192 PASS (95.3%)**
  - BBI 32/32 · HA 32/32 · WA 31/32 · TBU 31/32 · BBU 29/32 · BBTB 9/10 · BBTB% 19/22

9 failure tersisa berada di tepi band klasifikasi klinis (rounding dokter antar P25-P50 vs P10-P25). Tidak ada bug runtime; semua syntax check pass.

## Audit Trail
Setiap perhitungan menampilkan:
- Mode kalkulasi (Auto Split / WHO Strict / WHO Extended / CDC Only)
- Basis usia (kronologis vs koreksi prematur)
- Sumber tiap output (WHO 0-5, WHO 5-19, CDC, Klinis IDAI) dengan detail tabel
- Catatan ketika nilai berada di luar domain referensi
- Ekspor CSV memuat metadata mode dan sumber

## Struktur File
- `index.html` — UI utama (tab Antropometri, Grafik, Gizi, Interpretasi, Database, Bantuan)
- `styles.css` — full styling + dark mode
- `growth-data.js` — WHO 0-5, WHO 5-19, CDC 2000 (2-20 th), BBI Klinis IDAI, WA Klinis IDAI
- `clinical-core.js` — engine kalkulasi split WHO/CDC + audit trail + auto fallback
- `parser.js` — parser DOB / age parts / prematur correction
- `database-gizi.js` — RDA HA-based, TPG, PER, %BBI, simpan/load DB lokal, ekspor CSV
- `who-charting.js`, `cdc-charting.js`, `charting.js` — chart engine simplified
- `ui.js` — tab, dark mode, mode-sync, IntersectionObserver chart resize
- `qa_simplified.js` — 27 test smoke/UI
- `qa_split_matrix.js` — 23 test verifikasi mode split
- `qa_training_v2.js` — 192 asersi terhadap 32 pasien klinis (auto_split mode)
- `training_data.json` — dataset training klinis
- `build-info.json` — metadata build

## Cara Deploy
1. Unzip di server intranet/web manapun.
2. Buka `index.html` di browser. Tidak butuh backend.
3. Bila CDN Chart.js tidak dapat diakses, ganti URL di `index.html` dengan file lokal.

**Urutan load script tidak boleh diubah**:
`growth-data.js → clinical-core.js → database-gizi.js → who-charting.js → cdc-charting.js → charting.js → parser.js → ui.js`

## Cara Menjalankan QA (opsional)
```bash
npm install jsdom
node qa_simplified.js     # 27/27 PASS
node qa_split_matrix.js   # 23/23 PASS
node qa_training_v2.js    # 183/192 PASS (95.3%)
```

## Sumber Resmi
- WHO Child Growth Standards 2006: https://www.who.int/tools/child-growth-standards/standards
- WHO 2007 Growth Reference 5-19 yr: https://www.who.int/tools/growth-reference-data-for-5to19-years
- CDC 2000 Growth Charts: https://www.cdc.gov/growthcharts/cdc-growth-charts.htm
- Tabel BBI/WA Klinis: praktik IDAI (Ikatan Dokter Anak Indonesia)

## Catatan Klinis
- Anak prematur (gestasi < 37 mgg, umur kronologis < 24 bln) otomatis pakai usia koreksi.
- BBI klinis ditampilkan jika TB & gender tersedia (BB tidak wajib).
- %BBI = (BB / BBI) × 100. Klasifikasi: <70 Buruk · 70-90 Kurang · 90-110 Baik · 110-120 Lebih · >120 Obesitas.
- Status Utama mengikuti urutan: SAM → MAM → Obesity/Overweight → NWL+Stunting → Stunting → %BBI fallback → Gizi Baik.

## Riwayat Versi
- v6: WHO BBPB resmi + WHO 5-19 + tabel klinis IDAI (95% pass).
- v8: konsolidasi v6 sebagai production build.
- v10: arsitektur split WHO/CDC + audit trail + 4 mode kalkulasi.
- **v11 (final)**: v10 + reintegrasi tabel klinis IDAI ke mode auto_split + cakupan CDC penuh 2-20 tahun + UI label diperbarui.
