# Create .ssh directory if it doesn't exist
if (-not (Test-Path "$HOME\.ssh")) {
    New-Item -ItemType Directory -Path "$HOME\.ssh"
}

# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f "$HOME\.ssh\id_rsa" -N ""