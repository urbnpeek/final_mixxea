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
Write-Host "Verifying key is readable without passphrase prompt..."
& ssh-keygen -y -f $PrivateKey > $null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Key verification failed. Ensure the key is unencrypted (no passphrase)."
  exit 1
}

Write-Host ""
Write-Host "Private key path:"
Write-Host $PrivateKey

Write-Host ""
Write-Host "Command to print private key raw for GitHub secret VPS_SSH_KEY:"
Write-Host 'Get-Content -Raw "$env:USERPROFILE\.ssh\mixxea_gh_actions"'

Write-Host ""
Write-Host "Public key path:"
Write-Host $PublicKey

Write-Host ""
Write-Host "Command to append the public key to VPS authorized_keys safely (newline-safe):"
Write-Host "type `"$env:USERPROFILE\.ssh\mixxea_gh_actions.pub`" | ssh -i `"$env:USERPROFILE\.ssh\mixxea_ed25519`" code@185.185.82.93 `"mkdir -p ~/.ssh && chmod 700 ~/.ssh && (tail -c 1 ~/.ssh/authorized_keys 2>/dev/null | read -r _ || true); printf '\n' >> ~/.ssh/authorized_keys; cat >> ~/.ssh/authorized_keys; printf '\n' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys`""
