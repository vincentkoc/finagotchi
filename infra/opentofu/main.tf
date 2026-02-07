provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "backend" {
  name       = var.backend_droplet_name
  region     = var.region
  size       = var.backend_size
  image      = var.gpu_image_slug
  ssh_keys   = [var.ssh_key_fingerprint]
  monitoring = true
  tags       = ["finagotchi", "backend", "gpu"]
}

resource "digitalocean_droplet" "frontend" {
  name       = var.frontend_droplet_name
  region     = var.region
  size       = var.frontend_size
  image      = var.cpu_image_slug
  ssh_keys   = [var.ssh_key_fingerprint]
  monitoring = true
  tags       = ["finagotchi", "frontend", "cpu"]
}
