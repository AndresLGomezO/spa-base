# 📘 Master Plan — Metrics Consumption Layer (Firestore, Deterministic Access)

---

# 1. 🎯 Objective

Design and implement a **high-performance, deterministic metrics read system** that:

* Retrieves metrics in **O(1) reads (no queries)**
* Avoids **Firestore index explosion**
* Supports **fully dynamic UI-defined metrics**
* Enforces **tenant + owner-only isolation**
* Aligns perfectly with the **aggregation engine**

---

# 2. 🧠 Core Principles

---

## 2.1 Address, Don’t Query

Firestore is used as a **key-value store**, not a query engine.

👉 Metrics MUST be retrieved via **deterministic document IDs**, not queries.

---

## 2.2 Symmetry with Aggregation

The same logic used to:

* WRITE metrics (aggregation engine)

MUST be reused to:

* READ metrics (API)

---

## 2.3 Fully Data-Driven

* No hardcoded fields
* No fixed schemas
* All definitions come from Firestore (UI-created)

---

## 2.4 Owner-Only Isolation

All metrics are:

```text
tenant-scoped + user-scoped
```

👉 No shared/global metrics in this phase

---

# 3. 🧩 High-Level Architecture

```text
Client (React UI)
   ↓
Fastify API (Metrics Read Layer)
   ↓
Key Builder (shared package)
   ↓
Firestore (direct document access)
```

---

# 4. 📦 Storage Model

---

## 4.1 Collection Structure

```text
/tenants/{tenantId}/metrics/{metricId}/rows/{metricDocId}
```

---

## 4.2 Document Structure

```json
{
  "tenantId": "string",
  "metricId": "string",
  "userId": "string",

  "grouping": {
    "time": {
      "year": "2026",
      "month": "2026-06",
      "day": "2026-06-02"
    }
  },

  "dimensions": {
    "categoryId": "food",
    "accountId": "bank"
  },

  "values": {
    "sum_amount": 400,
    "count": 10
  },

  "checksum": "string",
  "updatedAt": "timestamp"
}
```

---

# 5. ⏱ Time Grouping Strategy (MANDATORY)

---

## 5.1 UI Requirement

When creating a metric, the user MUST define:

```json
{
  "timeGrouping": "hour | day | month | year"
}
```

---

## 5.2 API Responsibility

The API (aggregation engine) transforms raw timestamps into:

| Grouping | Stored Value  |
| -------- | ------------- |
| hour     | 2026-06-02T14 |
| day      | 2026-06-02    |
| month    | 2026-06       |
| year     | 2026          |

---

## 5.3 Storage Rule

Only the **selected grouping level** is stored in the key.

Example:

```json
"grouping": {
  "time": "2026-06"
}
```

---

## 5.4 Determinism Requirement

Time values MUST be:

* UTC normalized
* Zero-padded
* String-based

---

# 6. 🔑 Deterministic Key Builder (CRITICAL COMPONENT)

---

## 6.1 Purpose

Generate a **unique, stable, collision-safe document ID**

---

## 6.2 Input

```ts
{
  tenantId,
  metricId,
  userId,
  grouping,
  dimensions
}
```

---

## 6.3 Key Construction Rules

---

### Rule 1 — Sorted Keys

All dimension keys MUST be sorted alphabetically.

---

### Rule 2 — Stable Serialization

```ts
"grouping" → key=value|key=value
"dimensions" → key=value|key=value
```

---

### Rule 3 — Scope Inclusion

User MUST be part of the key:

```ts
scope = "user=" + userId
```

---

## 6.4 Raw Key Example

```text
tenantA|metricRevenue|user=123|time=2026-06|category=food|account=bank
```

---

## 6.5 Final ID

```ts
metricDocId = hash(rawKey)
```

---

## 6.6 Shared Package

```text
/packages/metrics-key-builder
```

Used by:

* Aggregation engine ✅
* Read API ✅

---

# 7. 🚀 API Design (Fastify)

---

# 7.1 GET Single Metric Row

---

## Endpoint

```http
POST /metrics/:metricId/row
```

---

## Request

```json
{
  "grouping": {
    "time": "2026-06"
  },
  "dimensions": {
    "categoryId": "food"
  }
}
```

---

## Behavior

1. Validate metric definition
2. Inject userId from auth context
3. Build deterministic key
4. Fetch document directly

---

## Response

```json
{
  "values": {
    "sum_amount": 400,
    "count": 10
  }
}
```

---

# 7.2 Batch Fetch (Dashboard Use Case)

---

## Endpoint

```http
POST /metrics/:metricId/batch
```

---

## Request

```json
{
  "queries": [
    {
      "grouping": { "time": "2026-06" },
      "dimensions": { "categoryId": "food" }
    },
    {
      "grouping": { "time": "2026-05" },
      "dimensions": { "categoryId": "food" }
    }
  ]
}
```

---

## Behavior

* Build multiple keys
* Fetch via Firestore `getAll`

---

## Response

```json
[
  { "values": {...} },
  { "values": {...} }
]
```

---

# 8. ⚙️ Validation Layer

---

## 8.1 Metric Definition Enforcement

For each request:

* Ensure grouping matches definition
* Ensure dimensions are allowed
* Reject unknown fields

---

## 8.2 Missing Dimensions

If a required dimension is missing:

👉 Reject request (no partial queries allowed)

---

# 9. 🚫 Unsupported Queries (Explicitly)

---

The system DOES NOT support:

* Partial dimension filtering
* Range queries (e.g. BETWEEN dates)
* Dynamic WHERE clauses

---

👉 All queries must be **fully specified**

---

# 10. 🔄 Consistency with Aggregation Engine

---

## Critical Rule

Aggregation MUST write using:

```ts
buildMetricKey(...)
```

---

If violated:

* Reads will fail
* Data fragmentation occurs

---

# 11. 🔐 Security Model

---

## Enforced in API

* Inject `tenantId`
* Inject `userId`
* NEVER accept them from client

---

## Firestore Rules (Optional reinforcement)

```text
allow read if request.auth.uid == resource.data.userId
```

---

# 12. 📈 Performance Characteristics

---

| Operation     | Cost    |
| ------------- | ------- |
| Single metric | O(1)    |
| Dashboard     | O(N)    |
| Index usage   | Minimal |
| Scaling       | Linear  |

---

# 13. 🧪 Testing Strategy

---

## 13.1 Key Determinism

* Same input → same key
* Different order → same key

---

## 13.2 Isolation

* Same metric, different users → different docs

---

## 13.3 Validation

* Invalid dimension → rejected
* Missing grouping → rejected

---

## 13.4 Batch

* Multiple keys resolve correctly

---

# 14. ⚠️ Risks & Mitigations

---

## Risk: Key mismatch

👉 Mitigation:

* Shared package (single source of truth)

---

## Risk: High cardinality

👉 Mitigation:

* Enforce limits at UI level

---

## Risk: Large dashboards

👉 Mitigation:

* Batch API
* Parallel fetch

---

# 15. ✅ Definition of Done

---

* Key builder implemented and shared
* Metrics stored with deterministic IDs
* API endpoints operational:

  * /row
  * /batch
* UI enforces time grouping selection
* API enforces validation rules
* Owner-only isolation guaranteed
* No reliance on Firestore queries

---

# 🏁 END
