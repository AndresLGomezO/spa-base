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
  firestore_index_prefix = var.firestore_collection_prefix

  # Composite indexes only (multi-field). Single-field collection-group indexes use fieldOverrides.
  firestore_composite_indexes_list = [
    for idx in try(local.firestore_indexes_file["indexes"], []) : idx
    if length(idx.fields) > 1
  ]
  firestore_indexes_map = {
    for idx in local.firestore_composite_indexes_list :
    "${idx.collectionGroup}_${try(idx.queryScope, "COLLECTION")}_${md5(jsonencode(idx.fields))}" => {
      collection  = local.firestore_index_prefix == null ? idx.collectionGroup : "${local.firestore_index_prefix}_${idx.collectionGroup}"
      query_scope = try(idx.queryScope, "COLLECTION")
      fields      = idx.fields
    }
  }

  firestore_field_overrides_list = try(local.firestore_indexes_file["fieldOverrides"], [])
  firestore_field_overrides_map = {
    for fo in local.firestore_field_overrides_list :
    "${fo.collectionGroup}_${fo.fieldPath}" => {
      collection = local.firestore_index_prefix == null ? fo.collectionGroup : "${local.firestore_index_prefix}_${fo.collectionGroup}"
      field_path = fo.fieldPath
      indexes    = fo.indexes
    }
  }
}

resource "google_firestore_index" "from_json" {
  for_each = local.firestore_indexes_map

  project     = local.gcp_project_id
  database    = "(default)"
  collection  = each.value.collection
  query_scope = each.value.query_scope

  depends_on = [google_firestore_database.database]

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path = fields.value.fieldPath
      order      = fields.value.order
    }
  }
}

resource "google_firestore_field" "from_json" {
  for_each = local.firestore_field_overrides_map

  project    = local.gcp_project_id
  database   = "(default)"
  collection = each.value.collection
  field      = each.value.field_path

  depends_on = [google_firestore_database.database]

  index_config {
    dynamic "indexes" {
      for_each = each.value.indexes
      content {
        query_scope = try(indexes.value.queryScope, "COLLECTION")
        order       = indexes.value.order
      }
    }
  }
}
