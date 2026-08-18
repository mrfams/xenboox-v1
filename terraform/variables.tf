# ─── Provider Tokens (set via env vars or tfvars) ─────────────────────────

variable "vercel_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "neon_api_key" {
  description = "Neon API key"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "upstash_api_token" {
  description = "Upstash Redis API token"
  type        = string
  sensitive   = true
}

variable "upstash_api_email" {
  description = "Upstash account email"
  type        = string
  sensitive   = true
}

# ─── Project Configuration ────────────────────────────────────────────────

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "xenboox"
}

variable "domain" {
  description = "Production domain"
  type        = string
  default     = "xenboox.com"
}

variable "region" {
  description = "Primary Vercel region"
  type        = string
  default     = "iad1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
