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

# Workers の静的サイト配信設定は wrangler.jsonc で管理
# カスタムドメイン (sol-momma.com) も wrangler.jsonc の routes で管理
