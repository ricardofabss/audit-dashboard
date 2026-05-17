# Contract Lifecycle Design v1 (Gadai MAS)

## Tujuan
Menyatukan data `Booking` dan `Pelunasan` agar:
- histori kontrak tetap lengkap,
- perpanjangan tidak menghapus siklus lama,
- analytics cabang bisa menghitung `new` vs `renewal` dengan benar.

## Tabel Inti
1. `contract_lifecycle_event`
- Grain: 1 baris = 1 event kontrak.
- Event yang disimpan:
  - `BOOKING_NEW`
  - `BOOKING_RENEWAL`
  - `SETTLEMENT`
- Kunci deduplikasi sumber: `source_event_key`.

2. `contract_lifecycle_current`
- Grain: 1 baris = status terbaru per rantai kontrak (`root_contract_no`) + `collateral_type`.
- Dipakai untuk query dashboard cepat (current status dan posisi terbaru kontrak).

## Aturan Relasi
1. Relasi utama lintas sumber: `contract_no (noSbg)` + `collateral_type`.
2. Jika `perpanjanganKe > 0` atau `noSbgLama` terisi, event booking dianggap `BOOKING_RENEWAL`.
3. `root_contract_no` menyimpan akar rantai kontrak agar seluruh siklus bisa ditelusuri.

## Aturan Status Current (Rekomendasi v1)
Urutan prioritas saat membentuk `contract_lifecycle_current`:
1. Event terakhir `SETTLEMENT` -> `SETTLED`.
2. Event terakhir booking renewal tanpa settlement -> `ROLLED_OVER`.
3. Booking aktif dengan `overdue_days > 0` -> `OVERDUE_ACTIVE`.
4. Selain itu -> `ACTIVE`.

## Kolom Kunci yang Wajib Terisi
- `contract_no`
- `collateral_type`
- `event_type`
- `event_date`
- `outlet_code`
- `source_event_key`

## Indexing Penting
- Event lookup: `(contract_no, collateral_type)`, `(root_contract_no, collateral_type)`.
- Analytics harian cabang: `(outlet_code, event_date)`.
- Current dashboard: `(outlet_code, last_event_date)`, `(status_current, last_event_date)`.
