terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Pages プロジェクト
resource "cloudflare_pages_project" "site" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "main"

  build_config = {
    build_command   = "pnpm build"
    destination_dir = "dist"
  }

  deployment_configs = {
    production = {
      environment_variables = {
        NODE_VERSION = "22"
      }
    }
    preview = {
      environment_variables = {
        NODE_VERSION = "22"
      }
    }
  }
}

# カスタムドメイン
resource "cloudflare_pages_domain" "custom_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.site.name
  name         = var.custom_domain
}
