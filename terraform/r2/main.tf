# ─── Cloudflare R2 Buckets ────────────────────────────────────────────────

resource "cloudflare_r2_bucket" "documents" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-documents"
  location   = "auto"
}

resource "cloudflare_r2_bucket" "exports" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-exports"
  location   = "auto"
}

# ─── CORS Configuration ──────────────────────────────────────────────────

resource "cloudflare_r2_bucket_cors" "documents_cors" {
  account_id       = var.cloudflare_account_id
  bucket_name      = cloudflare_r2_bucket.documents.name
  cors_rule {
    allowed_origins = ["https://${var.domain}", "https://www.${var.domain}"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

# ─── Lifecycle Rules ─────────────────────────────────────────────────────

# Auto-delete incomplete multipart uploads after 7 days
resource "cloudflare_r2_bucket_lifecycle" "documents_lifecycle" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.documents.name

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 0
      storage_class = "STANDARD"
    }

    expiration {
      days = 0
    }
  }
}

# Auto-delete export files after 30 days
resource "cloudflare_r2_bucket_lifecycle" "exports_lifecycle" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.exports.name

  rule {
    id     = "expire-exports"
    status = "enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 30
    }
  }
}

# ─── Outputs ──────────────────────────────────────────────────────────────

output "r2_documents_bucket" {
  description = "Documents R2 bucket name"
  value       = cloudflare_r2_bucket.documents.name
}

output "r2_exports_bucket" {
  description = "Exports R2 bucket name"
  value       = cloudflare_r2_bucket.exports.name
}

output "r2_endpoint" {
  description = "R2 S3-compatible endpoint"
  value       = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}
