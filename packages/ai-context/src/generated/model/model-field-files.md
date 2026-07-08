# Image and document fields

## EntityFileReference shape

```json
{
  "storagePath": "tenants/{tenantId}/entity-files/{entityName}/{fileId}.webp",
  "contentType": "image/webp",
  "fileName": "logo.webp"
}
```

| Property | Description |
|----------|-------------|
| storagePath | Server-managed GCS path. Set by upload API, not hand-authored on create. |
| contentType | **image:** `image/jpeg`, `image/png`, `image/webp`. **document:** `application/pdf`. |
| fileName | Original file name for download display. |

## Limits

- Default max: image **5MB**, document **10MB**.
- Override with `maxSizeBytes` (max cap **50MB**).
- Image fields may include `defaultImage` (same reference shape).
- File fields cannot be `sensitive`.
- Image and document fields may set `isArray: true` to store multiple files.
- Image arrays cannot include `defaultImage`.
