# Workstream 2 — CRUD API GENERATOR (FASTIFY)

## 1. Overview

The CRUD API Generator is responsible for automatically exposing REST endpoints for each entity defined in the Entity System.

This layer must:

* Dynamically register routes based on entity definitions
* Enforce validation using shared schemas
* Enforce tenant isolation
* Serve as the integration point for RBAC (next workstream)
* Provide consistent and predictable API behavior across all entities

This is a **core platform capability** that eliminates the need to manually build APIs for each business model.

---

## 2. Objective

Create a system that:

* Takes entity definitions as input
* Automatically generates CRUD endpoints
* Connects to the data layer (Firestore via DAL)
* Enforces:

  * Validation
  * Tenant isolation
  * Standard API structure

---

## 3. Deliverable

For each entity (e.g., `customer`), the system must expose:

```
GET    /api/customer
GET    /api/customer/:id
POST   /api/customer
PUT    /api/customer/:id
DELETE /api/customer/:id
```

---

## 4. API Behavior Specification

### 4.1 Base Route

```
/api/{entityName}
```

Example:

```
/api/customer
```

---

### 4.2 Endpoints

#### GET /api/{entity}

List records

**Query Params (Phase 1):**

* limit (optional)
* cursor or offset (optional)

---

#### GET /api/{entity}/:id

Get single record

---

#### POST /api/{entity}

Create record

* Validate body using entity schema
* Inject:

  * tenantId
  * createdAt
  * updatedAt

---

#### PUT /api/{entity}/:id

Update record

* Partial or full update (team decision: recommend partial)
* Validate against schema
* Update `updatedAt`

---

#### DELETE /api/{entity}/:id

Delete record

* Hard delete (Phase 1)
* Soft delete reserved for future

---

## 5. Request Context Requirements

Each request MUST include:

* Authenticated user (Firebase token already validated)
* tenantId (derived from user context)

---

### 5.1 Tenant Enforcement Rule

All operations MUST:

* Read only records with matching `tenantId`
* Write records with `tenantId` injected from context

**No client-provided tenantId allowed**

---

## 6. Validation

### 6.1 Input Validation

* Use schema from Entity System (Zod)
* Reject invalid payloads with consistent error format

---

### 6.2 Output Shape

All responses must follow a standard format:

```json
{
  "data": ...,
  "error": null
}
```

Error case:

```json
{
  "data": null,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR"
  }
}
```

---

## 7. Integration with Data Layer

The API must use the DAL (from future Workstream 3):

Example:

```ts
repository.create(data)
repository.findAll({ tenantId })
repository.findById(id, tenantId)
repository.update(id, data, tenantId)
repository.delete(id, tenantId)
```

---

## 8. Fastify Plugin Design

### 8.1 Structure

```ts
registerCrudRoutes(app, entity)
```

---

### 8.2 Responsibilities

* Register routes
* Bind handlers
* Attach validation
* Attach tenant filtering

---

### 8.3 Suggested Structure

```
/packages/api
  /crud
    registerCrudRoutes.ts
    handlers.ts
    schemas.ts
```

---

## 9. Non-Functional Requirements

### 9.1 Consistency

* All entities behave identically
* No custom per-entity logic in this phase

---

### 9.2 Performance

* Basic pagination required
* Avoid loading entire collections

---

### 9.3 Security

* Strict tenant isolation
* No data leakage across tenants

---

## 10. Inputs / Outputs

### Inputs

* Entity metadata (from Workstream 1)
* Authenticated request (user + tenantId)

---

### Outputs

* Registered Fastify routes
* Standardized API responses

---

## 11. Acceptance Criteria

### 11.1 Route Generation

* CRUD endpoints exist for at least 2 entities

---

### 11.2 Validation

* Invalid requests are rejected
* Required fields enforced

---

### 11.3 Tenant Isolation

* Users cannot access other tenant data
* All records include tenantId

---

### 11.4 Data Integrity

* Records created/updated correctly in Firestore

---

### 11.5 Consistency

* Same behavior across all entities

---

## 12. Testing & Validation (MANDATORY)

This workstream must be validated both via API tools and UI integration.

---

### 12.1 API Testing (Postman / REST Client)

#### Test Case 1 — Create Record

* POST /api/customer
* Valid payload → success
* Invalid payload → validation error

---

#### Test Case 2 — Tenant Isolation

* User A creates record
* User B tries to access it → must fail or return empty

---

#### Test Case 3 — Update

* Update existing record
* Verify updatedAt changes

---

#### Test Case 4 — Delete

* Delete record
* Ensure it no longer exists

---

---

### 12.2 UI Validation (CRITICAL)

Once frontend (basic UI) is connected:

#### Scenario 1 — Create via UI

* Fill form
* Submit
* Record appears in list

---

#### Scenario 2 — Validation Errors

* Submit invalid form
* Errors displayed (from backend schema)

---

#### Scenario 3 — Tenant Isolation

* Login as different tenant
* Data must NOT be visible

---

#### Scenario 4 — Full CRUD Flow

* Create → Edit → Delete from UI
* All operations succeed correctly

---

---

## 13. Risks & Considerations

### Risk 1: Leaking Tenant Data

Mitigation:

* NEVER trust client input for tenantId
* Always enforce at API level

---

### Risk 2: Schema Drift

Mitigation:

* Always use shared schema from Entity System
* Do NOT redefine validation

---

### Risk 3: Over-customization

Avoid:

* Custom endpoints per entity
* Business logic in handlers

---

## 14. Next Iteration (Awareness Only)

This API layer will later support:

* RBAC enforcement (next workstream)
* Advanced filtering/search
* Relations (joins)
* Soft deletes
* Audit logs

Do NOT implement these now, but ensure the structure allows extension.

---

## 15. Summary

This workstream transforms entity definitions into **real, usable APIs**.

When completed, the platform will:

* Expose CRUD endpoints automatically
* Enforce validation and tenant isolation
* Provide a stable backend contract for the UI

This is the **execution layer of the platform** and must be implemented with strict consistency and security.
