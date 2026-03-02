# MIXXEA Deploy Playbook (GitHub -> VPS)

## Deployment mode

- Stack detected: **Vite SPA**
- Build output: **dist/**
- Runtime on VPS: **Nginx static hosting only** (no Node service required)
- Default VPS path: **/home/code/mixxea**
- VPS host: **185.185.82.93**
- VPS user: **code**

`figma:asset/*` reliability:
- `vite.config.ts` includes `figmaAssetResolver` that resolves assets from:
  - `src/assets/<file>`
  - `public/assets/<file>`
- CI runs `npm run check:figma-assets` before build.

## GitHub secrets (required)

Set these in **GitHub repo -> Settings -> Secrets and variables -> Actions**:

- `VPS_HOST` = `185.185.82.93`
- `VPS_USER` = `code`
- `VPS_PATH` = `/home/code/mixxea`
- `VPS_SSH_KEY` = private key content for the deploy key/user

## Fix SSH agent passphrase prompt

- GitHub Actions cannot use passphrase-protected keys.
- Create a no-passphrase key for CI and paste its PRIVATE key into `VPS_SSH_KEY`.

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-ci-ssh.ps1
```

## One-time VPS setup

Run on your local machine (from repo root):

```bash
scp ./nginx.conf ./vps-setup.sh code@185.185.82.93:/home/code/
ssh code@185.185.82.93
sudo DOMAIN=YOUR_DOMAIN EMAIL=YOUR_EMAIL bash /home/code/vps-setup.sh
```

Then verify:

```bash
ssh code@185.185.82.93 "ls -la /home/code/mixxea/current/dist && sudo nginx -t && sudo systemctl status nginx --no-pager"
```

## Deploy flow (fast)

1. Push to `main`:

```bash
git add .
git commit -m "deploy: update"
git push origin main
```

2. GitHub Actions does:
- install deps
- `npm run check:figma-assets`
- `npm run build`
- `rsync ./dist/` to `/home/code/mixxea/current/dist/`
- `sudo nginx -t && sudo systemctl reload nginx`

## Manual redeploy (without new commit)

- GitHub -> Actions -> `Deploy MIXXEA (Vite)` -> `Run workflow`

## Quick checklist

- Set GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_PATH`, `VPS_SSH_KEY` (PRIVATE key, no passphrase)
- Re-run workflow from Actions tab.

## Notes

- If domain is not pointed yet, update DNS A record to `185.185.82.93` first.
- SSL issuance requires domain DNS to already resolve to the VPS.
- Keep `nginx.conf` in repo as source of truth; rerun `vps-setup.sh` safely after edits.
