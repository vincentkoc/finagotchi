# OpenTofu (DigitalOcean) — Finagotchi

This creates two droplets with **local state**:
- GPU backend droplet
- CPU frontend droplet

## Prereqs
- OpenTofu installed (`tofu`)
- DigitalOcean API token
- SSH key added in DigitalOcean (use its fingerprint)

## Usage
```bash
cd infra/opentofu
export TF_VAR_do_token="<your_do_token>"
export TF_VAR_ssh_key_fingerprint="<fingerprint>"

# Optional overrides
export TF_VAR_region="nyc2"
export TF_VAR_backend_size="g-rtx4000x1"
export TF_VAR_frontend_size="s-1vcpu-1gb"
export TF_VAR_gpu_image_slug="gpu-h100x1-base"   # change to your GPU image slug

# Init + apply

tofu init
tofu apply
```

## Outputs
- `backend_ip`
- `frontend_ip`

## Notes
- **Local state** is used by default (`terraform.tfstate` in this folder).
- GPU image slug varies by region. Check DO image list and update `gpu_image_slug` if needed.
