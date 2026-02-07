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
  description = "GPU droplet size slug"
  default     = "g-rtx4000x1"
}

variable "frontend_size" {
  type        = string
  description = "CPU droplet size slug"
  default     = "s-1vcpu-1gb"
}

variable "gpu_image_slug" {
  type        = string
  description = "GPU-optimized image slug"
  default     = "gpu-h100x1-base" # Replace if needed; see DO image list
}

variable "cpu_image_slug" {
  type        = string
  description = "CPU image slug"
  default     = "ubuntu-22-04-x64"
}
