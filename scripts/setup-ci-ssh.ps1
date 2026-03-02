$ErrorActionPreference = "Stop"

$UserProfile = $env:USERPROFILE
$SshDir = "$UserProfile\.ssh"
$KeyBase = "$SshDir\mixxea_ci_deploy"
$PrivateKey = $KeyBase
$PublicKey = "$KeyBase.pub"

Write-Host "Preparing deploy key at: $PrivateKey"

# Make sure directory exists
if (-not (Test-Path $SshDir)) {
    New-Item -ItemType Directory -Path $SshDir -Force | Out-Null
    Write-Host "✓ Created $SshDir"
} else {
    Write-Host "✓ $SshDir exists"
}

# Actually generate the key
if (-not (Test-Path $PrivateKey)) {
    $keygenCmd = "ssh-keygen -t ed25519 -C `"mixxea-gh-actions`" -f `"$PrivateKey`" -N `"""
    Write-Host "Running: $keygenCmd"
    $output = cmd /c $keygenCmd 2>&1
    Write-Host $output
    if (-not (Test-Path $PrivateKey)) {
        Write-Error "KEYGEN FAILED! Open another PowerShell window and run: $keygenCmd"
        exit 1
    } else {
        Write-Host "✓ Key generated!"
    }
} else {
    Write-Host "Key already exists. Reusing existing key."
}

Write-Host "`nChecking file presence:"
if (Test-Path $PrivateKey) {
    Write-Host "✓ $PrivateKey exists"
} else {
    Write-Host "❌ $PrivateKey does NOT exist!"
}

# Final output for secrets/VPS
Write-Host "`n================== PRIVATE KEY for GitHub VPS_SSH_KEY =================="
Get-Content -Raw $PrivateKey

Write-Host "`n================== PUBLIC KEY for VPS ~/.ssh/authorized_keys ============="
Get-Content -Raw $PublicKey

Write-Host @"
------------------------------------------------------------------------------
Use the public key above for your VPS. Use the private key as your GitHub secret.
ssh code@185.185.82.93 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
type "$PublicKey" | ssh code@185.185.82.93 "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

Test the key:
ssh -i "$PrivateKey" code@185.185.82.93 "echo Connected OK"
------------------------------------------------------------------------------
"@