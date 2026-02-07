# OpenTofu (DigitalOcean) — Finagotchi

This creates two droplets with **local state**:
- GPU backend droplet
- CPU frontend droplet

## Prereqs
- OpenTofu installed (`tofu`)
- DigitalOcean API token
- SSH key added in DigitalOcean (use its fingerprint)

## .env integration
Put these in your root `.env`:
```
DO_TOKEN=...
SSH_KEY_FINGERPRINT=...
DO_REGION=nyc2
DO_GPU_SIZE=g-rtx4000x1
DO_CPU_SIZE=s-1vcpu-1gb
DO_GPU_IMAGE_SLUG=gpu-h100x1-base
```

Load them into OpenTofu env vars:
```bash
./infra/opentofu/load_env.sh
```

## Auto-add SSH key (optional)
If you want to add your SSH key via API:
```bash
./infra/opentofu/add_ssh_key.sh
```

This reads `DO_TOKEN` from `.env` and uses `~/.ssh/id_ed25519.pub` by default.
It also writes the fingerprint back into `.env`.

## List DO resources
Find valid GPU size slug and image slug:
```bash
./infra/opentofu/list_do_sizes.sh
./infra/opentofu/list_do_images.sh
./infra/opentofu/list_do_keys.sh
```

## Usage
```bash
cd infra/opentofu
./load_env.sh

tofu init
tofu apply
```

## Generate SSH key + fingerprint
```bash
ssh-keygen -t ed25519 -C "finagotchi"
ssh-keygen -lf ~/.ssh/id_ed25519.pub | awk '{print $2}'
```

Add the public key to DigitalOcean, then set `SSH_KEY_FINGERPRINT` in `.env`.

## Outputs
- `backend_ip`
- `frontend_ip`

## Notes
- **Local state** is used by default (`terraform.tfstate` in this folder).
- GPU size + image slug varies by region. Use the list scripts to choose valid values.
