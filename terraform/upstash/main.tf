# ─── Upstash Redis Database ────────────────────────────────────────────────

resource "upstash_redis_database" "xenboox" {
  database_name = "${var.project_name}-redis"
  region        = "us-east-1"
  multizone     = true
}

# ─── Outputs ──────────────────────────────────────────────────────────────

output "upstash_redis_url" {
  description = "Redis connection URL (set as UPSTASH_REDIS_REST_URL in Vercel)"
  value       = upstash_redis_database.xenboox.rest_url
  sensitive   = true
}

output "upstash_redis_token" {
  description = "Redis auth token (set as UPSTASH_REDIS_REST_TOKEN in Vercel)"
  value       = upstash_redis_database.xenboox.rest_token
  sensitive   = true
}
