$ErrorActionPreference = "Stop"

# Konfigurasi CT 103 (Langsung via Tailscale)
$CT103_IP = "100.x.x.x"
$User = "root"
$TargetDir = "/root/audit-web"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Memulai Update Langsung ke CT 103 (SSH) " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$IP = Read-Host "Masukkan IP Tailscale CT 103 Anda (Bukan IP Host Proxmox)"
if ($IP -ne "") { $CT103_IP = $IP }

Write-Host "`n[1/4] Membuat arsip (zip) kode sumber..." -ForegroundColor Yellow
if (Test-Path "deploy-archive.zip") { Remove-Item "deploy-archive.zip" -Force }

$itemsToCompress = @("src", "public", "prisma", "scripts", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "middleware.ts", ".env", ".env.local") | Where-Object { Test-Path $_ }
Compress-Archive -Path $itemsToCompress -DestinationPath "deploy-archive.zip" -Force

Write-Host "`n[2/4] Mengirim file zip ke CT 103 ($CT103_IP)..." -ForegroundColor Yellow
scp deploy-archive.zip ${User}@${CT103_IP}:/root/deploy-archive.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "GAGAL! Pastikan IP Tailscale CT 103 benar dan OpenSSH-Server terinstal di dalamnya." -ForegroundColor Red
    exit
}

Write-Host "`n[3/4] Mengeksekusi instalasi langsung di dalam CT 103..." -ForegroundColor Yellow
$SshCommand = @"
    mkdir -p $TargetDir
    apt-get update && apt-get install unzip -y
    unzip -o /root/deploy-archive.zip -d $TargetDir
    rm /root/deploy-archive.zip
    cd $TargetDir
    echo '=> Menginstal dependensi (npm install)...'
    npm install
    echo '=> Menghasilkan ulang Prisma Client...'
    npx prisma generate
    echo '=> Membangun (Build) aplikasi Next.js...'
    npm run build
    echo '=> Membersihkan proses PM2 yang lama...'
    npm install -g pm2
    pm2 delete all || true
    echo '=> Menjalankan aplikasi versi terbaru...'
    pm2 start npm --name 'audit-web' -- start
    pm2 save
"@

ssh ${User}@${CT103_IP} $SshCommand
$sshExit = $LASTEXITCODE

Write-Host "`n[4/4] Membersihkan file sementara di komputer lokal..." -ForegroundColor Yellow
Remove-Item "deploy-archive.zip" -Force

if ($sshExit -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host " Berhasil! Aplikasi di CT 103 sudah di-Update " -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Silakan Refresh browser Proxmox Anda!"
} else {
    Write-Host "`n=========================================" -ForegroundColor Red
    Write-Host " GAGAL! Terjadi kesalahan saat instalasi. " -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
}
