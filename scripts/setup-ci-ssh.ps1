$ErrorActionPreference = "Stop"

$KeyBase = Join-Path $env:USERPROFILE ".ssh\mixxea_gh_actions"
$PrivateKey = $KeyBase
$PublicKey = "$KeyBase.pub"

Write-Host "Preparing no-passphrase CI key at: $PrivateKey"

if (-not (Test-Path $PrivateKey)) {
  & ssh-keygen -t ed25519 -f $PrivateKey -N "" -C "mixxea-gh-actions"
} else {
  Write-Host "Key already exists. Reusing existing key."
}

Write-Host ""
Write-Host "===== COPY THIS PRIVATE KEY INTO GITHUB SECRET VPS_SSH_KEY ====="
Get-Content -Raw $PrivateKey

Write-Host ""
Write-Host "===== PUBLIC KEY (append this to VPS ~/.ssh/authorized_keys) ====="
Get-Content -Raw $PublicKey

Write-Host ""
Write-Host "Run these commands manually (script does NOT SSH automatically):"
Write-Host 'ssh -i $env:USERPROFILE\.ssh\mixxea_ed25519 code@185.185.82.93 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"'
Write-Host 'type $env:USERPROFILE\.ssh\mixxea_gh_actions.pub | ssh -i $env:USERPROFILE\.ssh\mixxea_ed25519 code@185.185.82.93 "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"'
