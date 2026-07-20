$ErrorActionPreference = "Stop"

$ProxmoxIP = "proxmox.fabs.my.id"
$ProxmoxUser = "root"
$CTID = "103"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Memperbaiki Akses TUN untuk Tailscale di CT $CTID " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

$IP = Read-Host "Konfirmasi Alamat Proxmox Host Anda [$ProxmoxIP] (Tekan Enter jika benar)"
if ($IP -ne "") { $ProxmoxIP = $IP }

Write-Host "`nMenyambung ke Host Proxmox untuk menyuntikkan konfigurasi..." -ForegroundColor Yellow

# Skrip Bash yang akan dijalankan di dalam Host Proxmox
$RemoteBashScript = @"
    echo '[1/4] Mencadangkan konfigurasi lama...'
    cp /etc/pve/lxc/${CTID}.conf /etc/pve/lxc/${CTID}.conf.bak

    echo '[2/4] Mengecek apakah konfigurasi TUN sudah ada...'
    if grep -q 'lxc.cgroup2.devices.allow: c 10:200 rwm' /etc/pve/lxc/${CTID}.conf; then
        echo 'Konfigurasi TUN sudah ada. Melewati penambahan.'
    else
        echo 'Menambahkan izin perangkat /dev/net/tun ke konfigurasi CT $CTID...'
        echo 'lxc.cgroup2.devices.allow: c 10:200 rwm' >> /etc/pve/lxc/${CTID}.conf
        echo 'lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file' >> /etc/pve/lxc/${CTID}.conf
    fi

    echo '[3/4] Merestart Container $CTID agar konfigurasi baru terbaca...'
    pct stop $CTID
    sleep 2
    pct start $CTID
    sleep 3

    echo '[4/4] Memancing Tailscale agar menyala di dalam Container...'
    pct exec $CTID -- bash -c "systemctl enable tailscaled"
    pct exec $CTID -- bash -c "systemctl restart tailscaled"
    
    echo ''
    echo 'Cek Status Tailscale di dalam CT ${CTID}:'
    pct exec $CTID -- bash -c "tailscale status" || echo 'Tailscale belum terautentikasi.'
"@

# Eksekusi skrip Bash di Proxmox Host via SSH
ssh ${ProxmoxUser}@${ProxmoxIP} $RemoteBashScript
$sshExit = $LASTEXITCODE

if ($sshExit -eq 0) {
    Write-Host "`n=====================================================" -ForegroundColor Green
    Write-Host " BERHASIL! Tailscale di dalam CT $CTID kini aktif! " -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "Jika status Tailscale meminta autentikasi ulang, jalankan perintah ini di Proxmox:"
    Write-Host "pct exec $CTID -- tailscale up" -ForegroundColor Yellow
} else {
    Write-Host "`n=====================================================" -ForegroundColor Red
    Write-Host " GAGAL terhubung ke Proxmox Host via SSH. " -ForegroundColor Red
    Write-Host "=====================================================" -ForegroundColor Red
}
