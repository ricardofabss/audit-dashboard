# Data Dictionary v1 - Gadai MAS (Booking & Pelunasan)

## 1) Ruang Lingkup
- Sumber data:
  - `Booking.xlsx`
  - `Pelunasan.xlsx`
- Segment jaminan:
  - Sheet `konsol` = jaminan **emas**
  - Sheet `elektronik` = jaminan **elektronik**
- Tujuan:
  - Fondasi analytics harian per cabang untuk risk monitoring.

## 2) Standar Dimensi (Dipakai Lintas Tabel)

| Nama Standar | Sumber Kolom | Tipe | Keterangan |
|---|---|---|---|
| `business_unit` | konstanta | string | `GADAI_MAS` |
| `collateral_type` | nama sheet | string | `EMAS` / `ELEKTRONIK` |
| `outlet_code` | `kodeOutlet` | string | Kode outlet/cabang level operasional |
| `outlet_name` | `namaOutlet` | string | Nama outlet |
| `branch_name` | `namaCabang` | string | Nama cabang |
| `region_name` | `namaWilayah` | string | Nama wilayah |
| `area_name` | `namaArea` | string | Nama area |
| `contract_no` | `noSbg` | string | Nomor SBG (kunci bisnis utama) |
| `customer_id` | `cif` | string | ID nasabah |

## 3) Dictionary - Booking

| Kolom Sumber | Nama Standar | Tipe | Kegunaan Analytics |
|---|---|---|---|
| `produk` | `product_code` | string | Segmentasi produk |
| `namaProduk` | `product_name` | string | Label produk |
| `noSbg` | `contract_no` | string | Join ke pelunasan, tracking kontrak |
| `cif` | `customer_id` | string | Analisis customer-level (opsional) |
| `tglRegister` | `register_date` | date | Funnel booking/register |
| `tglCair` | `disbursement_date` | date | Booking cair harian/bulanan |
| `tanggalPelunasan` | `planned_settlement_date` | date | Estimasi jatuh akhir kontrak |
| `tenor` | `tenor_days` | int | Profil risiko tenor |
| `ovd` | `overdue_days` | int | Early warning keterlambatan |
| `ltv` | `ltv_ratio` | decimal | Risiko pinjaman terhadap taksiran |
| `pokokAwal` | `principal_initial` | decimal | Exposure awal |
| `pinjamAwal` | `loan_initial` | decimal | Nilai pinjaman awal |
| `saldoPokok` | `principal_outstanding` | decimal | Exposure tersisa |
| `saldoBunga` | `interest_outstanding` | decimal | Bunga belum lunas |
| `saldoPinjam` | `loan_outstanding` | decimal | Total outstanding |
| `biayaAdmin` | `admin_fee_current` | decimal | Margin/biaya aktif |
| `biayaAdminAwal` | `admin_fee_initial` | decimal | Baseline biaya admin |
| `diskonAdmin` | `admin_discount` | decimal | Diskon biaya admin |
| `taksir` | `appraisal_value` | decimal | Nilai taksir utama (exposure quality) |
| `berat` | `collateral_weight` | decimal | Khusus emas (jika terisi) |
| `karat` | `collateral_karat` | decimal | Khusus emas (jika terisi) |
| `statusAplikasi` | `application_status` | string | Kualitas proses booking |
| `perpanjanganKe` | `renewal_count` | int | Indikator nasabah rollover |
| `jenisPembayaran` | `payment_type` | string | Pola pembayaran |
| `bankFunding` | `funding_bank` | string | Sumber pendanaan |
| `bankPendana` | `partner_bank` | string | Partner pendana |
| `porsiBank` | `bank_share_ratio` | decimal | Eksposur pihak pendana |
| `namaPenaksir` | `appraiser_name` | string | Analisis kualitas taksasi |
| `tanggalJam` | `event_ts` | datetime | Jam proses untuk pola transaksi |

## 4) Dictionary - Pelunasan

| Kolom Sumber | Nama Standar | Tipe | Kegunaan Analytics |
|---|---|---|---|
| `produk` | `product_code` | string | Segmentasi produk |
| `noSbg` | `contract_no` | string | Join ke booking |
| `cif` | `customer_id` | string | Customer-level analytics (opsional) |
| `tglCair` | `disbursement_date` | date | Umur kontrak saat lunas |
| `tanggalPelunasan` | `settlement_date` | date | Pelunasan harian/bulanan |
| `tglJatuhTempo` | `due_date` | date | Analisis tepat waktu vs terlambat |
| `tenor` | `tenor_days` | int | Profil kontrak |
| `ovd` | `overdue_days` | int | Keterlambatan saat pelunasan |
| `pokokAwal` | `principal_initial` | decimal | Exposure awal |
| `pinjamAwal` | `loan_initial` | decimal | Nilai pinjaman awal |
| `rate` | `rate_value` | decimal | Suku rate |
| `nilaiLunas` | `settlement_amount` | decimal | Nilai pelunasan |
| `nilaiPenjualan` | `sale_amount` | decimal | Realisasi penjualan barang jaminan |
| `acrueBunga` | `accrued_interest` | decimal | Bunga terakru |
| `pendapatanBunga` | `interest_income` | decimal | Pendapatan bunga aktual |
| `biayaPemeliharaan` | `maintenance_fee` | decimal | Biaya pemeliharaan jaminan |
| `adminPenjualan` | `sale_admin_fee` | decimal | Biaya admin penjualan |
| `diskonPelunasan` | `settlement_discount` | decimal | Diskon pelunasan |
| `diskonPenjualan` | `sale_discount` | decimal | Diskon penjualan |
| `pelunasanJf` | `partner_settlement_amount` | decimal | Pelunasan pihak pendana |
| `statusPelunasan` | `settlement_status` | string | Status proses lunas |
| `statusExit` | `exit_status` | string | Kategori keluar kontrak |
| `sumBeratBersih` | `net_weight_total` | decimal | Berat bersih agunan (jika ada) |
| `avgKarat` | `karat_avg` | decimal | Rata-rata karat (jika ada) |
| `angsuranKe` | `installment_no` | int | Tahap cicilan/pelunasan |

## 5) Aturan Transformasi Dasar
1. Normalisasi kode outlet:
   - `outlet_code = upper(trim(kodeOutlet))`
2. Normalisasi tanggal:
   - Booking event date: `coalesce(tglCair, tglRegister)`
   - Pelunasan event date: `tanggalPelunasan`
3. Normalisasi numerik:
   - Kolom nilai uang/rate/ltv/berat/karat diparsing ke decimal.
4. Mapping jenis jaminan:
   - Nama sheet mengisi `collateral_type`.
5. Null handling:
   - `null` numerik -> `0` hanya untuk agregasi tertentu; simpan raw null di staging.

## 6) Aturan Kualitas Data Minimum
1. `contract_no` wajib terisi.
2. `outlet_code` wajib terisi.
3. `event_date` wajib valid.
4. Nilai uang tidak boleh negatif (kecuali memang definisi bisnis mengizinkan).
5. Cek duplikasi record dengan kunci awal:
   - Booking: `contract_no + disbursement_date + collateral_type`
   - Pelunasan: `contract_no + settlement_date + collateral_type`

## 7) KPI Harian v1 (Per Cabang)
1. `booking_event_count` = seluruh event booking cair (termasuk perpanjangan).
2. `new_booking_count` = booking dengan `perpanjanganKe` kosong/0.
3. `renewal_booking_count` = booking dengan `perpanjanganKe` > 0.
4. `booking_amount` = sum(`loan_initial`) dari event booking.
5. `ovd_booking_count` = jumlah booking dengan `overdue_days > 0`.
6. `avg_ltv` = rata-rata `ltv_ratio`.
7. `settlement_count` = jumlah kontrak lunas.
8. `settlement_amount` = sum(`settlement_amount`).
9. `late_settlement_count` = jumlah pelunasan dengan `overdue_days > 0`.
10. `interest_income` = sum(`interest_income`).
11. `sale_amount` = sum(`sale_amount`) untuk indikasi disposal jaminan.

## 8) Catatan v1
- Definisi bisnis untuk `statusPelunasan`, `statusExit`, `ovd`, dan `nilaiPenjualan` perlu dikonfirmasi user bisnis untuk final KPI.
- Setelah konfirmasi definisi, kita lanjut ke:
  - `risk_score_branch_daily` (bobot final),
  - dashboard ranking cabang risiko tertinggi.

## 9) Klarifikasi Siklus Booking vs Pelunasan
1. Satu `noSbg` bisa muncul berkali-kali di Booking karena perpanjangan.
2. Setiap perpanjangan diperlakukan sebagai event booking baru (`renewal`), bukan overwrite histori.
3. `tglCair` pada booking renewal dianggap tanggal cair siklus saat itu.
4. Untuk relasi ke Pelunasan, gunakan kunci utama:
   - `contract_no (noSbg)` + `collateral_type`
5. Untuk hindari salah hitung, dashboard wajib menampilkan metrik booking terpisah:
   - booking baru (`new`)
   - booking perpanjangan (`renewal`)
