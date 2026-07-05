# Aggregation Engine Operations

Operational guide for the event-driven aggregation pipeline. Design reference: [aggregations.md](./aggregations.md).

## Pipeline

1. API CRUD writes emit events only when the tenant has **ACTIVE** metrics for that `sourceModel`.
2. Events are stored at `tenants/{tenantId}/__events/{eventId}` with a checksum.
3. **Local / inline (host-only default):** when `AGGREGATION_EVENTS_PUBSUB=false`, the API processes the event immediately after persisting it and writes `tenants/{tenantId}/metrics/{metricName}/rows/{docId}`. No worker or Pub/Sub required.
4. **Production / async:** when `AGGREGATION_EVENTS_PUBSUB=true`, the API publishes `{ eventId, tenantId }` to the `aggregation-events` topic and `apps/worker-aggregation` consumes messages to update metric rows.

## Structured logs

| Log key | When |
| --- | --- |
| `aggregation_event_emitted` | API persisted a new event |
| `aggregation_event_processed` | Worker finished successfully |
| `aggregation_event_skipped` | Duplicate delivery; event already `PROCESSED` |
| `aggregation_event_failed` | Worker error; event marked `FAILED` |

Fields: `eventId`, `tenantId`, `model`, `latencyMs`, `error` (on failure).

## Alerts (recommended)

- **Stuck events:** `status == PENDING` and `timestamp` older than 15 minutes.
- **High failure rate:** more than 5% of events in `FAILED` over a 10-minute window.
- **Retry pressure:** `retries` consistently increasing for the same `eventId`.

## Local development

Pub/Sub runs as part of the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) on port **8085** (`PUBSUB_EMULATOR_HOST`). It is configured in [`firebase.json`](../firebase.json) under `emulators.pubsub` and started with `firebase emulators:start --only ... pubsub`.

### Docker full stack (async e2e, default)

`pnpm dev:docker` starts:

- `firebase-emulator` (Auth, Firestore, Storage, Hosting, **Pub/Sub**)
- `pubsub-init` (creates `aggregation-events` topic)
- `api`, `worker-aggregation`, `web`

The API runs with `AGGREGATION_EVENTS_PUBSUB=true` and `PUBSUB_EMULATOR_HOST=firebase-emulator:8085`. After CRUD on a metric's `sourceModel`:

1. `__events/{id}` is written with status `PENDING`
2. The worker consumes the Pub/Sub message and writes `metrics/{target.collection}/rows/`
3. Event status becomes `PROCESSED` (brief async delay)

### Host-native quick dev (inline)

For `pnpm --filter api dev` without Pub/Sub, leave `AGGREGATION_EVENTS_PUBSUB` unset (defaults to `false`). CRUD writes `__events` and updates metrics in the same request.

### Host-native async e2e

```bash
pnpm emulators   # includes pubsub on 127.0.0.1:8085

# Bootstrap topic (once per emulator restart)
PUBSUB_EMULATOR_HOST=127.0.0.1:8085 GCP_PROJECT_ID=demo-project-base pnpm tsx scripts/init-pubsub-emulator.ts

# Terminal 1 — worker
PUBSUB_EMULATOR_HOST=127.0.0.1:8085 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GCP_PROJECT_ID=demo-project-base \
pnpm --filter worker-aggregation dev

# Terminal 2 — API
PUBSUB_EMULATOR_HOST=127.0.0.1:8085 \
AGGREGATION_EVENTS_PUBSUB=true \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
pnpm --filter api dev
```

## GCP (dev / staging / prod)

Terraform ([`pubsub-aggregation-events.tf`](../packages/infrastructure/terraform/pubsub-aggregation-events.tf), [`cloudrun-worker-aggregation.tf`](../packages/infrastructure/terraform/cloudrun-worker-aggregation.tf)) provisions per workspace:

| Resource | Name |
| -------- | ---- |
| Pub/Sub topic | `aggregation-events` |
| Subscription | `aggregation-events-worker` |
| API env | `AGGREGATION_EVENTS_PUBSUB=true`, `AGGREGATION_EVENTS_TOPIC=aggregation-events` |
| Worker Cloud Run | `es-worker-aggregation-{dev\|stg\|prod}` |

CI builds and deploys both `api` and `worker-aggregation` images on every deploy. The API publishes after CRUD; the worker updates metric rows asynchronously (same as local Docker e2e, without emulators).

Verify in Cloud Logging: `aggregation_event_emitted` (API), `aggregation_event_processed` (worker).

## Backfill

Admins trigger `POST /api/metric-definitions/:id/backfill` from Settings → Metrics.

**Snapshot rebuild (not event replay):** backfill resets the target metric's row documents, scans all records in the metric's `sourceModel` collection, recomputes aggregates from current document state, and seeds the contribution ledger. For **query-backed** metrics (`sourceQueryDefinitionId`), the scan still loads all `sourceModel` documents but only includes records that match the saved query filter at backfill time. This is the supported way to include documents that existed before the metric was activated.

| Scenario | Behavior |
| --- | --- |
| First backfill | Allowed without a version bump |
| Repeat backfill | Requires a metric version increase and a change that touches `fieldsDependency` |
| Pre-metric documents | Included only after snapshot backfill (no CREATE events exist for them) |
| Event replay alone | **Not used** — replaying `__events` cannot recover missing CREATE events and may double-apply UPDATE deltas |

## Cold start (pre-metric documents)

When a metric becomes ACTIVE, CRUD on existing documents emits UPDATE (or DELETE) events but no CREATE events. Without special handling, the engine would subtract the old `before` value even though that document was never counted — e.g. amount `1000 → 1` yields `-999` instead of `+1`.

**Contribution ledger:** for each `(metricDefinitionId, sourceDocumentId)` the worker tracks whether the document has ever contributed, at:

`tenants/{tenantId}/__metric_contributions/{metricDefinitionId}/sources/{documentId}`

| Ledger state | UPDATE behavior |
| --- | --- |
| Not in ledger | First inclusion: apply `+after` only (like CREATE), then write ledger entry |
| In ledger | Net change: `-before + after` |

Run snapshot backfill after activating a metric on entities with existing rows so historical totals match current source data.

## Metric row keys (`userId`)

Metric row document IDs include the source document `ownerId` as `userId` in `buildMetricDocId`. Reads use the authenticated user’s uid (see [metrics-consumption.md](./metrics-consumption.md)).

After upgrading from keys that omitted `userId`, run **backfill per metric** so rows are rewritten under the new ids. Old rows are orphaned until deleted manually or by a future cleanup job.

## Known limitations (v1)

- Hook-driven writes (`createHookEntityServices`) do not emit aggregation events.
- Share-service and other direct Firestore writes bypass the event pipeline.
- Hot metric documents may require sharding `docId` at extreme write rates.
