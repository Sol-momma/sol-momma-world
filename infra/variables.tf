variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name"
  type        = string
  default     = "sol-momma-world"
}

variable "custom_domain" {
  description = "Custom domain for the site"
  type        = string
  default     = "sol-momma.com"
}
