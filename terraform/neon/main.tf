# ─── Neon Project ──────────────────────────────────────────────────────────

resource "neon_project" "xenboox" {
  name = var.project_name

  # Production branch (main)
  # Neon creates a default branch automatically
}

# ─── Production Branch ────────────────────────────────────────────────────

resource "neon_branch" "main" {
  project_id = neon_project.xenboox.id
  name       = "main"
}

# ─── Staging Branch ──────────────────────────────────────────────────────

resource "neon_branch" "staging" {
  project_id = neon_project.xenboox.id
  name       = "staging"
  parent_id  = neon_branch.main.id
}

# ─── Compute Autoscaling ─────────────────────────────────────────────────
# Neon auto-scales compute from 0.25 to 4 CU.
# Production minimum: 1 CU (no cold starts for critical paths).

# ─── Outputs ──────────────────────────────────────────────────────────────

output "neon_project_id" {
  description = "Neon project ID"
  value       = neon_project.xenboox.id
}

output "neon_connection_string" {
  description = "Production database connection string (set as DATABASE_URL in Vercel)"
  value       = neon_project.xenboox.connection_uris[0].connection_uri
  sensitive   = true
}

output "neon_staging_connection_string" {
  description = "Staging database connection string"
  value       = neon_branch.staging.connection_uris[0].connection_uri
  sensitive   = true
}
