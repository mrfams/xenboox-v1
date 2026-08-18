terraform {
  required_version = ">= 1.5"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.4"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.0"
    }
  }

  # Uncomment for team state management:
  # cloud {
  #   organization = "xenboox"
  #   workspaces {
  #     name = "xenboox-production"
  #   }
  # }
}

# ─── Provider Configuration ───────────────────────────────────────────────

provider "vercel" {
  token = var.vercel_token
}

provider "neon" {
  api_key = var.neon_api_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "upstash" {
  email    = var.upstash_api_email
  api_token = var.upstash_api_token
}
