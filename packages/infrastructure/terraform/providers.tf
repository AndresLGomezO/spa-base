provider "google" {
  project = local.gcp_project_id
  region  = var.region

  default_labels = {
    managed_by  = "terraform"
    environment = local.workspace
    workspace   = terraform.workspace
  }
}

provider "google-beta" {
  project = local.gcp_project_id
  region  = var.region
}
