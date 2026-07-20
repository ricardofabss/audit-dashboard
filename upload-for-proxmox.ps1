$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Mempersiapkan File Update untuk Proxmox (Tanpa SSH) " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Membuat arsip (zip) kode sumber..." -ForegroundColor Yellow
if (Test-Path "deploy-archive.zip") { Remove-Item "deploy-archive.zip" -Force }

$itemsToCompress = @("src", "public", "prisma", "scripts", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "middleware.ts", ".env", ".env.local") | Where-Object { Test-Path $_ }
Compress-Archive -Path $itemsToCompress -DestinationPath "deploy-archive.zip" -Force

Write-Host "`n[2/3] Mengunggah file zip ke server transfer sementara (transfer.sh)..." -ForegroundColor Yellow
Write-Host "Mohon tunggu, ini mungkin memakan waktu beberapa menit tergantung kecepatan internet Anda..."

# Upload ke bashupload.com (Server khusus untuk terminal wget)
$curlResult = curl.exe -s -T deploy-archive.zip bashupload.com

# Ekstrak otomatis URL download dari hasil curl
$DownloadLink = ""
if ($curlResult -match "(http://bashupload.com/\S+)") {
    $DownloadLink = $matches[1]
} else {
    $DownloadLink = "LINK_TIDAK_DITEMUKAN"
}

Write-Host "`n[3/3] Membersihkan file lokal..." -ForegroundColor Yellow
Remove-Item "deploy-archive.zip" -Force

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host " UPLOAD BERHASIL!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "`nLangkah Selanjutnya:"
Write-Host "Buka jendela Console hitam CT 103 Anda di web Proxmox."
Write-Host "Tinggal COPY-PASTE kotak perintah biru ini (sudah otomatis berisi link Anda) lalu tekan Enter:`n" -ForegroundColor White

$ProxmoxCommands = @"
apt-get update && apt-get install unzip wget -y
wget -O /root/deploy-archive.zip $DownloadLink
mkdir -p /root/audit-web
unzip -o /root/deploy-archive.zip -d /root/audit-web
rm /root/deploy-archive.zip
cd /root/audit-web
npm install
npx prisma generate
npm run build
npm install -g pm2
pm2 restart audit-web || pm2 start npm --name 'audit-web' -- start
pm2 save
"@

Write-Host $ProxmoxCommands -ForegroundColor Cyan
Write-Host "`nCatatan: Link unduhan di atas akan kedaluwarsa secara otomatis." -ForegroundColor Gray
