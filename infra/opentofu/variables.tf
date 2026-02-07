variable "do_token" {
  type        = string
  description = "DigitalOcean API token"
  sensitive   = true
}

variable "region" {
  type        = string
  description = "DigitalOcean region"
  default     = "nyc2"
}

variable "ssh_key_fingerprint" {
  type        = string
  description = "SSH key fingerprint already added to DigitalOcean"
}

variable "backend_droplet_name" {
  type        = string
  default     = "finagotchi-backend"
}

variable "frontend_droplet_name" {
  type        = string
  default     = "finagotchi-frontend"
}

variable "backend_size" {
  type        = string
  description = "Backend droplet size slug"
  default     = "s-4vcpu-8gb"
}

variable "frontend_size" {
  type        = string
  description = "Frontend droplet size slug"
  default     = "s-1vcpu-1gb"
}

variable "backend_image_slug" {
  type        = string
  description = "Backend image slug"
  default     = "ubuntu-22-04-x64"
}

variable "frontend_image_slug" {
  type        = string
  description = "Frontend image slug"
  default     = "ubuntu-22-04-x64"
}
