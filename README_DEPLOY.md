# MIXXEA Deployment Playbook

Detected stack: **Vite SPA (React)**  
Detected package manager rule result: **npm** (no `pnpm-lock.yaml` found)

Default VPS path: `/var/www/mixxea`

## Placeholders to edit first

- `YOUR_DOMAIN` in `nginx.conf` and `vps-setup.sh`
- `YOUR_EMAIL` in `vps-setup.sh`
- `YOUR_VPS_HOST` in `deploy.sh` (or export `VPS_HOST`)
- `VPS_USER` in `deploy.sh` (default is `mixxea`)
- `SSH_KEY` in `deploy.sh` (default is `~/.ssh/id_rsa`)
- GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PATH`
- Repo URL placeholder in commands below

## Phase 1: Push repo to GitHub

```bash
git init
git branch -M main
git add .
git commit -m "chore: production deploy setup (nginx, vps bootstrap, ci deploy)"
git remote add origin https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git
git push -u origin main
```

## Phase 2: VPS bootstrap (Ubuntu)

```bash
scp ./vps-setup.sh root@YOUR_VPS_HOST:/root/vps-setup.sh
ssh root@YOUR_VPS_HOST
chmod +x /root/vps-setup.sh
nano /root/vps-setup.sh
# set DOMAIN and EMAIL, save, then:
bash /root/vps-setup.sh
```

Notes:
- This creates dedicated Linux user `mixxea`.
- UFW is enabled with `OpenSSH`, `80`, `443` only.
- For Vite, Nginx serves `/var/www/mixxea/current/dist`.
- For Next.js (if you switch later), `mixxea.service` is created/enabled.

## Phase 3: Deploy app

Option A: local one-command deploy
```bash
export VPS_HOST=YOUR_VPS_HOST
export VPS_USER=mixxea
export VPS_PATH=/var/www/mixxea
export SSH_KEY=~/.ssh/id_rsa
bash deploy.sh
```

Option B: GitHub Actions auto-deploy
```bash
# Add repo secrets in GitHub:
# VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_PATH
git add .
git commit -m "chore: trigger deployment"
git push origin main
```

## Phase 4: Deploy Supabase Edge Function

Edge Functions run on Supabase infrastructure, not on your VPS.

```bash
npm i -g supabase
supabase login
supabase functions deploy make-server-f4d1ffe4 --project-ref gotvednpnpkbcplurvvu
```
