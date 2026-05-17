# Surat Tugas Generator v1

## Tujuan
Membuat draft **Surat Tugas Pemeriksaan** secara cepat dari form terstruktur, tanpa mengotomasi tanda tangan owner.

## Aturan Bisnis
- Wajib **1 Koordinator**.
- Wajib minimal **1 Anggota**.
- Tanda tangan tetap **manual**.
- Nomor surat **auto-generate** dengan pola: `YYYY.XXX/ST-SMG/{ROMAN_MONTH}/DIA`.
- Sequence nomor berjalan otomatis per tahun (disimpan di local browser untuk mode frontend saat ini).

## Lokasi Implementasi
- UI: `src/modules/approvals/task-order-generator.tsx`
- Halaman: `src/app/approvals/page.tsx`
- Utility nomor surat: `src/lib/surat-tugas.ts`

## Field Utama
- Metadata surat: tanggal surat (auto saat generate), business unit, cabang, jenis penugasan.
- Periode: periode audit + rentang pelaksanaan.
- Tim: koordinator + array anggota.
- Narasi: tujuan pemeriksaan (multi-line), catatan.
- Penutup: nama dan jabatan penandatangan (manual sign block).

## Alur Penggunaan
1. Buka menu `Approval Workflow`.
2. Isi form **Generator Surat Tugas**.
3. Klik **Generate Draft Surat Tugas**.
4. Cek panel **Preview Draft**.
5. Klik **Salin Draft** untuk dipindah ke dokumen resmi.

## Catatan
Draft ini fokus ke konsistensi isi dan struktur. Untuk produksi final, dokumen resmi tetap perlu review legal/sekretariat dan tanda tangan basah/digital owner sesuai kebijakan internal.
