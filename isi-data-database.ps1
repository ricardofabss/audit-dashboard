$ErrorActionPreference = "Stop"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Memulai Pengisian Database Proxmox (CT 104) " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Menyiapkan struktur tabel Database..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss

Write-Host "`n[2/3] Menyuntikkan Data Audit Dasar (Mock Data)..." -ForegroundColor Yellow
# Coba jalankan prisma db seed, atau jalankan file seed.mjs secara manual
npx prisma db seed

Write-Host "`n[3/3] Menyuntikkan Data Laporan Excel..." -ForegroundColor Yellow
if (Test-Path "scripts/import-all-data.mjs") {
    node scripts/import-all-data.mjs
} else {
    Write-Host "File import-all-data.mjs tidak ditemukan, melewati langkah ini." -ForegroundColor Gray
}

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host " BERHASIL! Database Anda sekarang sudah terisi! " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "Silakan muat ulang (Refresh/F5) halaman dasbor Proxmox Anda di browser." -ForegroundColor White
