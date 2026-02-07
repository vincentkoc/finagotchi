provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "backend" {
  name       = var.backend_droplet_name
  region     = var.region
  size       = var.backend_size
  image      = var.backend_image_slug
  ssh_keys   = [var.ssh_key_fingerprint]
  monitoring = true
  tags       = ["finagotchi", "backend", "cpu"]
}

resource "digitalocean_droplet" "frontend" {
  name       = var.frontend_droplet_name
  region     = var.region
  size       = var.frontend_size
  image      = var.frontend_image_slug
  ssh_keys   = [var.ssh_key_fingerprint]
  monitoring = true
  tags       = ["finagotchi", "frontend", "cpu"]
}
