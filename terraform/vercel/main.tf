# ─── Vercel Project ────────────────────────────────────────────────────────

resource "vercel_project" "xenboox" {
  name      = var.project_name
  framework = "nextjs"

  build_command    = "pnpm build --filter=@xenboox/web"
  install_command  = "pnpm install --frozen-lockfile"
  output_directory = ".next"

  root_directory = "apps/web"

  git_repository {
    type = "github"
    repo = "mrfams/xenboox"
  }

  # Environment variables (non-secret config; secrets via Vercel dashboard)
  environment = [
    {
      key    = "NEXT_PUBLIC_APP_URL"
      value  = "https://${var.domain}"
      target = ["production"]
    },
    {
      key    = "NODE_ENV"
      value  = "production"
      target = ["production"]
    },
    {
      key    = "NEXT_PUBLIC_APP_ENV"
      value  = "production"
      target = ["production"]
    },
  ]

  # Serverless function configuration
  serverless_function_region = var.region

  # Protection bypass for automated deployments
 保护 = {
    deployment_production = var.deployment_protection_level
  }
}

# ─── Domain Configuration ────────────────────────────────────────────────

resource "vercel_project_domain" "production" {
  project_id = vercel_project.xenboox.id
  domain     = var.domain
}

resource "vercel_project_domain" "www" {
  project_id = vercel_project.xenboox.id
  domain     = "www.${var.domain}"
}

# ─── Cron Jobs ────────────────────────────────────────────────────────────

resource "vercel_deployment_cron" "webhook_delivery" {
  project_id = vercel_project.xenboox.id
  schedule   = "*/5 * * * *"
  path       = "/api/cron/webhook-delivery"
}

resource "vercel_deployment_cron" "daily_digest" {
  project_id = vercel_project.xenboox.id
  schedule   = "0 6 * * *"
  path       = "/api/cron/daily-digest"
}

resource "vercel_deployment_cron" "month_end_close" {
  project_id = vercel_project.xenboox.id
  schedule   = "0 9 1 * *"
  path       = "/api/cron/month-end-close"
}

# ─── Outputs ──────────────────────────────────────────────────────────────

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.xenboox.id
}

output "vercel_url" {
  description = "Vercel deployment URL"
  value       = vercel_project.xenboox.url
}
