output "pages_project_name" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.site.name
}

output "pages_subdomain" {
  description = "Cloudflare Pages default subdomain"
  value       = "${cloudflare_pages_project.site.name}.pages.dev"
}

output "custom_domain" {
  description = "Custom domain"
  value       = cloudflare_pages_domain.custom_domain.name
}
