# Workstream 1 — ENTITY SYSTEM (CORE FOUNDATION)

## 1. Overview

The Entity System is the **core abstraction layer** of the platform. It defines how business data models are declared, validated, stored, and consumed across the entire ecosystem (API, UI, RBAC, and future modules).

This system must support:

* Multi-tenant isolation (per business)
* Schema-driven behavior (single source of truth)
* Type safety across backend and frontend
* Extensibility for future features (relations, workflows, customization)

---

## 2. Objective

Create a standardized, type-safe mechanism to define entities such that:

* A developer can define a business model in a single place
* The system can derive:

  * Validation schemas
  * TypeScript types
  * Metadata for API generation
  * Metadata for UI rendering
  * Permission definitions (used in RBAC)

---

## 3. Key Concepts

### 3.1 Entity

An entity represents a business data model (e.g., Customer, Order).

Each entity is:

* Tenant-aware
* Schema-driven
* Self-descriptive (fields + metadata)

---

### 3.2 Field

A field defines a property within an entity.

Each field includes:

* Type
* Validation rules
* UI metadata (future usage)
* Optional constraints

---

### 3.3 Tenant Context

All entities must be scoped by tenant.

**Rule:**
Every entity record MUST include a `tenantId`.

This ensures:

* Data isolation between businesses
* Secure multi-tenancy

---

## 4. Deliverable

### 4.1 Entity Definition API

Provide a function:

```ts
defineEntity(config)
```

---

### 4.2 Example

```ts
export const Customer = defineEntity({
  name: "customer",

  fields: {
    name: {
      type: "string",
      required: true
    },
    email: {
      type: "string"
    },
    age: {
      type: "number"
    },
    isActive: {
      type: "boolean",
      default: true
    },
    createdAt: {
      type: "date"
    }
  }
})
```

---

## 5. Functional Requirements

### 5.1 Supported Field Types

Phase 1 must support:

* string
* number
* boolean
* date

---

### 5.2 Field Properties

Each field supports:

| Property | Description              |
| -------- | ------------------------ |
| type     | Data type                |
| required | Boolean                  |
| default  | Default value            |
| optional | Implicit if not required |

---

### 5.3 System Fields (Auto-Injected)

The system MUST automatically include:

```ts
id: string
tenantId: string
createdAt: Date
updatedAt: Date
```

These must NOT be manually defined by developers.

---

### 5.4 Validation

* Use Zod (or equivalent) to generate schema
* Validation must be:

  * Shared (backend + frontend)
  * Enforced on all writes

---

### 5.5 Type Generation

Each entity must produce:

```ts
type Customer = {
  id: string
  tenantId: string
  name: string
  email?: string
  age?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

### 5.6 Metadata Output

Each entity must expose metadata for downstream systems:

```ts
{
  name: "customer",
  fields: { ... },
  schema: ZodSchema,
  permissions: [
    "customer.read",
    "customer.create",
    "customer.update",
    "customer.delete"
  ]
}
```

---

## 6. Non-Functional Requirements

### 6.1 Type Safety

* Full type inference across:

  * API
  * UI
  * Shared packages

---

### 6.2 Extensibility

Design must allow future additions:

* Relations (foreign keys)
* Field-level permissions
* Custom field types
* UI configuration

---

### 6.3 Isolation

* No entity should access another tenant’s data
* Tenant awareness must be enforced downstream (API layer)

---

## 7. Inputs / Outputs

### Inputs

* Entity configuration object (developer-defined)

---

### Outputs

* Zod schema
* TypeScript types
* Entity metadata object
* Permission list

---

## 8. Implementation Guidelines

### 8.1 Suggested Package Structure

```
/packages
  /entities
    defineEntity.ts
    types.ts
    fieldTypes.ts
```

---

### 8.2 defineEntity Responsibilities

* Normalize config
* Inject system fields
* Build validation schema
* Generate metadata
* Generate permissions

---

### 8.3 Avoid

* Business logic inside entities
* Direct database logic
* UI-specific logic (keep metadata generic)

---

## 9. Acceptance Criteria

The workstream is complete when:

### 9.1 Entity Definition

* At least 2 entities can be defined successfully

---

### 9.2 Validation

* Invalid data is rejected via schema
* Required fields enforced

---

### 9.3 Type Safety

* Types are inferred automatically
* No manual typing required

---

### 9.4 Metadata Availability

* API layer can consume entity metadata
* UI layer can consume entity metadata

---

### 9.5 Multi-Tenant Readiness

* All entities include tenantId
* No entity can be defined without tenant awareness

---

## 10. Testing Strategy

### Unit Tests

* Schema generation correctness
* Required field enforcement
* Default values applied

---

### Integration Tests

* Entity definition → schema → type flow works
* Metadata usable by mock API/UI

---

## 11. Risks & Considerations

### Risk 1: Over-engineering

Avoid adding:

* Relations
* UI configs
* Advanced validation

These belong to later phases.

---

### Risk 2: Tight Coupling

Ensure:

* Entity system does NOT depend on API or UI
* It remains a pure definition layer

---

## 12. Next Iteration (Awareness Only)

This system will be extended to support:

* Relationships (one-to-many)
* Dynamic UI rendering
* Advanced permissions (field-level)
* Query capabilities (filtering, sorting)

Do NOT implement these now, but design with extension points.

---

## 13. Summary

The Entity System is the **foundation of the entire platform**.

If implemented correctly, it will enable:

* Automatic API generation
* Automatic UI rendering
* Scalable RBAC integration
* Rapid business module development

This is the most critical workstream — prioritize simplicity, clarity, and extensibility.
