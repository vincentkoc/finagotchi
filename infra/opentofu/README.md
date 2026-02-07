# OpenTofu (DigitalOcean) — Finagotchi (CPU)

This creates two droplets with **local state**:
- CPU backend droplet
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
DO_BACKEND_SIZE=s-4vcpu-8gb
DO_FRONTEND_SIZE=s-1vcpu-1gb
DO_BACKEND_IMAGE_SLUG=ubuntu-22-04-x64
DO_FRONTEND_IMAGE_SLUG=ubuntu-22-04-x64
DO_VPC_UUID=your-vpc-uuid
```

Load them into OpenTofu env vars:
```bash
eval "$(./infra/opentofu/load_env.sh --print)"
```

## Auto-add SSH key (optional)
If you want to add your SSH key via API:
```bash
./infra/opentofu/add_ssh_key.sh
```

This reads `DO_TOKEN` from `.env` and uses `~/.ssh/id_ed25519.pub` by default.
It also writes the fingerprint back into `.env`.

## List DO resources
```bash
./infra/opentofu/list_do_sizes.sh
./infra/opentofu/list_do_keys.sh
./infra/opentofu/list_do_vpcs.sh
```

## Usage
```bash
cd infra/opentofu
./load_env.sh

tofu init
tofu apply -lock=false
```

## Auto-deploy after tofu
```bash
./infra/opentofu/deploy_after_tofu.sh
```

This SSHes into both droplets, runs the bootstrap scripts, and prints next steps.

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
