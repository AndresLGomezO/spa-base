resource "google_firestore_database" "database" {
  project     = local.gcp_project_id
  name        = "(default)"
  location_id = var.db_location_id
  type        = "FIRESTORE_NATIVE"

  depends_on = [
    google_project_service.firestore_api,
    google_firebase_project.default,
  ]
}

resource "google_firebaserules_ruleset" "firestore" {
  project = local.gcp_project_id

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../../../firestore.rules")
    }
  }

  depends_on = [google_project_service.firebaserules_api]
}

resource "google_firebaserules_release" "primary" {
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project      = local.gcp_project_id
}

locals {
  firestore_indexes_file = jsondecode(file("${path.module}/../../../firestore.indexes.json"))
  firestore_indexes_list = local.firestore_indexes_file["indexes"]
  firestore_index_prefix = var.firestore_collection_prefix
  firestore_indexes_map = {
    for idx in local.firestore_indexes_list :
    "${idx.collectionGroup}_${md5(jsonencode(idx.fields))}" => {
      collection = local.firestore_index_prefix == null ? idx.collectionGroup : "${local.firestore_index_prefix}_${idx.collectionGroup}"
      fields     = idx.fields
    }
  }
}

resource "google_firestore_index" "from_json" {
  for_each = local.firestore_indexes_map

  project    = local.gcp_project_id
  database   = "(default)"
  collection = each.value.collection

  depends_on = [google_firestore_database.database]

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path = fields.value.fieldPath
      order      = fields.value.order
    }
  }
}
