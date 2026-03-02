$ErrorActionPreference = "Stop"

# Choose key names/paths
$SshDir = Join-Path $env:USERPROFILE ".ssh"
$KeyBase = Join-Path $SshDir "mixxea_gh_actions"
$PrivateKey = $KeyBase
$PublicKey = "$KeyBase.pub"

# Ensure .ssh directory exists
if (-not (Test-Path $SshDir)) {
    New-Item -ItemType Directory -Path $SshDir -Force | Out-Null
    Write-Host "✓ Created .ssh directory at: $SshDir"
}

Write-Host "`nPreparing no-passphrase CI key at: $PrivateKey"

# Correct keygen call: use string, and *quotes* for all paths/comments
if (-not (Test-Path $PrivateKey)) {
    $keygenCmd = "ssh-keygen -t ed25519 -f `"$PrivateKey`" -C `"mixxea-gh-actions`" -N `""" 
    Write-Host "Running: $keygenCmd"
    $result = cmd /c $keygenCmd
    if (-not (Test-Path $PrivateKey)) {
        Write-Error "Failed to generate SSH key!"
        exit 1
    } else {
        Write-Host "✓ Key generated."
    }
} else {
    Write-Host "Key already exists. Reusing existing key."
}

# Check: can we read public key?
Write-Host "`nVerifying public/private key..."
try {
    $test = & ssh-keygen -y -f $PrivateKey 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Private key is readable, and not passphrase-protected."
    } else {
        throw "Key not usable for CI (probably passphrase-protected)."
    }
} catch {
    Write-Error "Key verification failed. Ensure the key is *NOT* passphrase-protected."
    exit 1
}

Write-Host "`n===== COPY THIS PRIVATE KEY INTO GITHUB SECRET VPS_SSH_KEY ====="
Get-Content -Raw $PrivateKey

Write-Host "`n===== PUBLIC KEY (append to your VPS ~/.ssh/authorized_keys) ====="
Get-Content -Raw $PublicKey

Write-Host @"
------------------------------------------------------------------------------
TO REGISTER THE PUBLIC KEY ON YOUR VPS, USE THESE STEPS:

ssh code@185.185.82.93 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
type "$PublicKey" | ssh code@185.185.82.93 "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

Then test:
ssh -i "$PrivateKey" code@185.185.82.93 "echo Connected OK"
------------------------------------------------------------------------------
"@