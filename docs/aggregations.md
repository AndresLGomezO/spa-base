# 📘 Master Plan — Dynamic Event-Driven Aggregation Engine (Firestore)

---

# 1. 🎯 Objective

Design and implement a **fully dynamic, tenant-isolated, event-driven aggregation engine** that:

* Reacts to **data mutations (create/update/delete)** via API
* Computes **metrics in near real-time**
* Is **fully configurable via UI (no hardcoded schemas)**
* Guarantees **idempotency and correctness**
* Supports **versioning + controlled backfills**

---

# 2. 🧠 Core Principles

1. **Everything is data-driven**

   * Models, metrics, hooks stored in Firestore
   * No hardcoded business logic

2. **Event-first architecture**

   * All aggregations derived from events

3. **Idempotent processing**

   * Same event NEVER applied twice

4. **Tenant isolation**

   * All collections scoped under tenant

5. **Append-only + replayable**

   * Events enable backfills and debugging

---

# 3. 🧩 High-Level Architecture

```text
Client (React)
   ↓
Fastify API (primary write path)
   ↓
Event Builder + Checksum
   ↓
Event Store (Firestore)
   ↓
Pub/Sub Topic
   ↓
Aggregation Worker (Cloud Run)
   ↓
Metrics Storage (Firestore)
```

---

# 4. 📦 Monorepo Structure

```text
/apps
  /api                → Fastify (event producer)
  /worker-aggregation → Pub/Sub consumer

/packages
  /event-engine       → event creation + checksum
  /metrics-engine     → DSL interpreter
  /aggregation-engine → delta computation
  /schema-engine      → model definitions

/infrastructure
  /terraform
```

---

# 5. ⚡ Event System (PRIMARY FOUNDATION)

---

## 5.1 Event Trigger Source (MANDATORY)

All writes MUST go through Fastify API:

```ts
createDocument()
updateDocument()
deleteDocument()
```

👉 API is responsible for:

* Capturing BEFORE / AFTER
* Building event
* Storing event
* Publishing event

---

## 5.2 Minimum Event Structure

```json
{
  "eventId": "uuid",
  "tenantId": "string",
  "model": "string",
  "operation": "CREATE | UPDATE | DELETE",

  "documentId": "string",

  "before": "object | null",
  "after": "object | null",

  "changedFields": ["fieldA", "fieldB"],

  "schemaVersion": "number",

  "timestamp": "ISO",

  "checksum": "string",

  "status": "PENDING | PROCESSED | FAILED",

  "retries": 0
}
```

---

## 5.3 Checksum Strategy (STRONG IDEMPOTENCY)

Checksum MUST be:

```ts
checksum = hash(
  tenantId +
  model +
  documentId +
  operation +
  stableStringify(before) +
  stableStringify(after)
)
```

---

## 5.4 Event Storage

```text
/tenants/{tenantId}/__events/{eventId}
```

---

## 5.5 Idempotency Rules

* Event is processed ONLY if:

  * `status !== PROCESSED`
* Use Firestore transaction:

  * Read event
  * Process aggregation
  * Mark PROCESSED

---

# 6. 📊 Metrics Definition (UI-DRIVEN DSL)

---

## 6.1 Storage

```text
/tenants/{tenantId}/__metrics_definitions/{metricId}
```

---

## 6.2 Structure

```json
{
  "metricId": "string",
  "name": "string",

  "sourceModel": "string",

  "filters": [],
  "groupBy": [],
  "dimensions": [],

  "aggregations": [
    {
      "field": "string",
      "operation": "SUM | COUNT | AVG"
    }
  ],

  "target": {
    "collection": "string",
    "granularity": "dynamic"
  },

  "version": 1,

  "schemaVersionDependency": 3,

  "fieldsDependency": ["amount", "categoryId"],

  "status": "ACTIVE | PAUSED"
}
```

---

## 6.3 UI Requirements

UI must allow:

* Selecting source model
* Selecting fields dynamically
* Defining filters
* Defining groupBy + dimensions
* Selecting aggregation operations
* Version tracking
* Manual "Run Backfill" trigger

---

# 7. ⚙️ Aggregation Engine

---

## 7.1 Worker (Async Processing)

Use:

* Pub/Sub topic: `aggregation-events`
* Worker: Cloud Run

---

## 7.2 Processing Flow

```text
Receive Event
   ↓
Load Metrics Definitions (tenant scoped)
   ↓
Filter relevant metrics:
   - model match
   - operation match
   - field dependency match
   ↓
For each metric:
   ↓
Compute delta
   ↓
Apply aggregation
   ↓
Mark event processed
```

---

## 7.3 Metric Matching Optimization

Only process metric if:

```ts
event.model === metric.sourceModel &&
intersects(event.changedFields, metric.fieldsDependency)
```

---

# 8. 🧮 Delta Computation Engine

---

## 8.1 Rules

| Operation | Delta          |
| --------- | -------------- |
| CREATE    | +after         |
| DELETE    | -before        |
| UPDATE    | after - before |

---

## 8.2 Field-Level Delta

```ts
delta = (after[field] ?? 0) - (before[field] ?? 0)
```

---

## 8.3 Filter Awareness

If event crosses filter boundary:

* Was included before? → remove
* Is included now? → add

---

# 9. 📦 Metrics Storage (QUERY OPTIMIZED)

---

## 9.1 Structure

```text
/tenants/{tenantId}/metrics/{metricName}/{docId}
```

---

## 9.2 Flattened Pattern (RECOMMENDED)

```json
{
  "group": {
    "month": "2026-06"
  },
  "dimensions": {
    "categoryId": "food"
  },
  "values": {
    "sum_amount": 400,
    "count_amount": 10,
    "avg_amount": 40,
    "count": 10
  }
}
```

---

## 9.3 Benefits

* Queryable with Firestore indexes
* Avoid nested maps
* Supports dynamic filters

---

# 10. 🔄 Backfill Strategy (CONTROLLED)

---

## 10.1 Trigger

Manual via UI:

```text
"Run Backfill"
```

---

## 10.2 When Required

Trigger ONLY if:

* metric.version changed
  AND
* relevant fields changed:

```ts
if (
  metric.version changed &&
  intersects(metric.fieldsDependency, changedFields)
)
```

---

## 10.3 Execution

* Scan events collection
* Replay events
* Respect idempotency

---

## 10.4 Idempotent Replay

Since each event has:

* eventId
* checksum

👉 Already processed events are skipped

---

# 11. 🔌 Hook System (FUTURE INTEGRATION)

---

## 11.1 Design

```text
/tenants/{tenantId}/__hooks/{hookId}
```

---

## 11.2 Example

```json
{
  "trigger": "model.operation",
  "conditions": [],
  "actions": [
    {
      "type": "AGGREGATION",
      "metricId": "..."
    }
  ]
}
```

---

## 11.3 Integration Strategy

Future:

* Replace direct metric matching with hook evaluation layer
* Aggregation becomes one possible action

---

# 12. 🧪 Testing Strategy

---

## 12.1 Unit

* Delta computation
* Metric matching
* Filter logic

---

## 12.2 Integration

Flow:

```text
API write → Event → Worker → Metric updated
```

---

## 12.3 Idempotency

* Send same event twice
* Verify metrics unchanged

---

## 12.4 Replay

* Run backfill twice
* Verify no duplication

---

## 12.5 Multi-Tenant

* Same models, different tenants
* Ensure strict isolation

---

# 13. 📈 Observability

---

## Metrics

* Event processing latency
* Failed events
* Retry count

---

## Logs

* Event lifecycle
* Aggregation steps

---

## Alerts

* High failure rate
* Stuck events

---

# 14. ⚠️ Risks & Mitigations

---

## Hot Documents

→ Use sharding strategy

---

## Schema Drift

→ Version + dependency tracking

---

## Event Volume

→ Batch processing in worker

---

# 15. ✅ Definition of Done

* Events generated via API
* Events stored with checksum
* Pub/Sub pipeline active
* Worker processes events
* Metrics updated correctly
* Idempotency guaranteed
* UI defines metrics dynamically
* Backfill works safely

---

# 🏁 END
