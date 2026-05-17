# ETL Mingguan Gadai MAS - Panduan Run

## 1) Tujuan
Script ini memproses data `Booking.xlsx` dan `Pelunasan.xlsx` per periode mingguan operasional:
- Week 1: periode tanggal 1-7, dipublish tanggal 8
- Week 2: periode tanggal 8-14, dipublish tanggal 15
- Week 3: periode tanggal 15-21, dipublish tanggal 22
- Week 4: periode tanggal 22-akhir bulan, dipublish tanggal 1 bulan berikutnya

Output ke tabel:
- `contract_lifecycle_event`
- `contract_lifecycle_current`
- `branch_weekly_snapshot`

## 2) Lokasi Script
- Runner: `scripts/etl/weekly_gadai_mas.mjs`
- Extractor Excel: `scripts/etl/extract_gadai_mas_weekly.py`

## 3) Cara Menjalankan
Default (mengikuti tanggal hari ini):
```bash
npm run etl:weekly:gadai
```

Manual override window:
```bash
npm run etl:weekly:gadai -- --windowStart 2026-05-01 --windowEnd 2026-05-07 --weekIndex 1 --periodMonth 5 --periodYear 2026 --publishedDate 2026-05-08
```

Override lokasi folder data:
```bash
npm run etl:weekly:gadai -- --dataDir "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Gadai MAS"
```

## 4) Verifikasi Cepat
```sql
select count(*) from contract_lifecycle_event;
select count(*) from contract_lifecycle_current;
select count(*) from branch_weekly_snapshot;
```
