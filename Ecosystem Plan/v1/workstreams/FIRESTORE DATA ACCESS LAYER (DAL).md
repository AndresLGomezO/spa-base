# Workstream 3 — FIRESTORE DATA ACCESS LAYER (DAL)

## 1. Overview

The Firestore Data Access Layer (DAL) is responsible for **all interactions with the database**.

This layer abstracts Firestore completely from the rest of the system and provides:

* A consistent API for data operations
* Tenant-aware queries and writes
* Strong typing using shared entity definitions
* A single place to evolve persistence logic in the future

The DAL ensures that:

* No other layer directly interacts with Firestore
* Data consistency and isolation rules are always enforced

---

## 2. Objective

Create a reusable, type-safe repository system that:

* Is generated per entity
* Implements CRUD operations
* Enforces tenant isolation at the data level
* Uses Firestore converters (already available in your repo)
* Can be extended later (soft deletes, auditing, indexing)

---

## 3. Core Concept

### 3.1 Repository Pattern

Each entity will have a corresponding repository:

```ts
CustomerRepository
OrderRepository
```

These repositories encapsulate all Firestore operations.

---

## 4. Deliverable

### 4.1 Repository Interface

Each repository must expose:

```ts
create(data)
findAll(params)
findById(id, tenantId)
update(id, data, tenantId)
delete(id, tenantId)
```

---

### 4.2 Example Usage

```ts
const customer = await CustomerRepository.create({
  name: "John Doe",
  email: "john@example.com"
})

const customers = await CustomerRepository.findAll({
  tenantId,
  limit: 20
})
```

---

## 5. Data Model Design (Firestore)

### 5.1 Collection Strategy

Each entity maps to a collection:

```id="q5e9s8"
/tenants/{tenantId}/{entityName}/{documentId}
```

Example:

```id="xkz4qg"
/tenants/tenant_123/customer/abc123
```

---

### 5.2 Rationale

* Strong tenant isolation
* Scalable per tenant
* Easier security enforcement
* Clear separation of data

---

## 6. Functional Requirements

### 6.1 Create

* Generate document ID
* Inject:

  * id
  * tenantId
  * createdAt
  * updatedAt

---

### 6.2 Find All

* Must filter by tenantId
* Support:

  * limit
  * pagination (cursor or offset)

---

### 6.3 Find By ID

* Must include tenantId in query
* Return null if not found or mismatched tenant

---

### 6.4 Update

* Validate existence
* Update only allowed fields
* Update `updatedAt`

---

### 6.5 Delete

* Hard delete (Phase 1)
* Must enforce tenant match

---

## 7. Firestore Converter Integration

Use your existing converters to:

* Serialize/deserialize documents
* Maintain type safety
* Avoid manual mapping

---

### Example

```ts
collection.withConverter(customerConverter)
```

---

## 8. Multi-Tenant Enforcement (CRITICAL)

### Rule

Every operation MUST include tenantId:

* Reads → filter by tenantId
* Writes → inject tenantId
* Updates/Deletes → validate tenant ownership

---

### Forbidden

* Queries without tenant filter
* Using client-provided tenantId
* Cross-tenant access

---

## 9. Package Structure

```id="f1bqmv"
/packages
  /dal
    createRepository.ts
    baseRepository.ts
    firestoreClient.ts
```

---

## 10. Repository Factory

### 10.1 Function

```ts
createRepository(entity)
```

---

### 10.2 Responsibilities

* Bind entity schema
* Bind Firestore collection path
* Attach converter
* Return typed CRUD methods

---

## 11. Non-Functional Requirements

### 11.1 Type Safety

* All methods must be fully typed
* No `any` usage

---

### 11.2 Isolation

* Tenant isolation enforced at repository level (not just API)

---

### 11.3 Replaceability

* Must be possible to replace Firestore later without affecting API/UI layers

---

### 11.4 Performance

* Use indexed queries where needed (future)
* Avoid full collection scans

---

## 12. Inputs / Outputs

### Inputs

* Entity metadata
* tenantId (from API layer)
* Data payload

---

### Outputs

* Typed entity records
* Firestore documents

---

## 13. Acceptance Criteria

### 13.1 Repository Availability

* Repository generated for at least 2 entities

---

### 13.2 CRUD Operations

* All methods work correctly
* Data persists correctly in Firestore

---

### 13.3 Tenant Isolation

* No cross-tenant access possible
* All records include tenantId

---

### 13.4 Type Safety

* Full typing across methods
* No runtime shape mismatches

---

### 13.5 No Direct Firestore Usage

* API layer does NOT use Firestore directly
* Only DAL is used

---

## 14. Testing & Validation (MANDATORY)

---

### 14.1 Unit Testing

#### Test Case 1 — Create

* Create record
* Verify:

  * id generated
  * tenantId injected
  * timestamps present

---

#### Test Case 2 — Find All

* Insert multiple records
* Fetch with tenantId
* Ensure only tenant-specific data returned

---

#### Test Case 3 — Find By ID

* Fetch valid record → success
* Fetch with wrong tenant → null

---

#### Test Case 4 — Update

* Update record
* Verify:

  * updatedAt changed
  * values updated correctly

---

#### Test Case 5 — Delete

* Delete record
* Ensure it no longer exists

---

---

### 14.2 API Integration Validation

Using API (from Workstream 2):

* Perform CRUD operations
* Verify:

  * Data matches Firestore
  * Tenant isolation enforced

---

---

### 14.3 UI Validation (CRITICAL)

Once UI is connected:

#### Scenario 1 — Data Persistence

* Create record via UI
* Refresh page
* Data persists correctly

---

#### Scenario 2 — Multi-Tenant Isolation

* Login as Tenant A → create data
* Login as Tenant B → data not visible

---

#### Scenario 3 — Edit Flow

* Edit record via UI
* Changes persist correctly

---

#### Scenario 4 — Delete Flow

* Delete record via UI
* Record disappears and is removed from DB

---

---

## 15. Risks & Considerations

### Risk 1: Incorrect Collection Structure

Mitigation:

* Enforce `/tenants/{tenantId}/{entity}` pattern strictly

---

### Risk 2: Missing Tenant Filters

Mitigation:

* Centralize queries in repository
* Never expose raw Firestore access

---

### Risk 3: Tight Coupling to Firestore

Mitigation:

* Abstract logic in repository factory
* Avoid Firestore-specific logic leaking out

---

## 16. Next Iteration (Awareness Only)

This layer will later support:

* Soft deletes (deletedAt)
* Audit logs (createdBy, updatedBy)
* Advanced querying (filters, search)
* Batch operations
* Caching layer

Do NOT implement these now, but design with extension in mind.

---

## 17. Summary

The DAL is the **data backbone of the platform**.

It guarantees:

* Secure multi-tenant data access
* Clean separation of concerns
* Scalability for future features

Once completed, the platform will have a **fully reliable persistence layer**, enabling the API and UI to operate safely and consistently.
