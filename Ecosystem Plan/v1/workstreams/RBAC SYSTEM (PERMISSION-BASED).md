# Workstream 4 — RBAC SYSTEM (PERMISSION-BASED)

## 1. Overview

The RBAC (Role-Based Access Control) system is responsible for controlling **who can do what** across the platform.

This system must support:

* Platform-level control (superuser)
* Tenant-level roles (per business)
* Permission-based access (not hardcoded roles)
* Integration with API and UI

This is a **critical security layer** and must be implemented with strict consistency.

---

## 2. Objective

Design and implement a permission-based RBAC system that:

* Generates permissions automatically from entities
* Assigns permissions through roles
* Assigns roles to users per tenant
* Enforces permissions at API level
* Enables UI to adapt based on permissions

---

## 3. Core Concepts

### 3.1 Permission

A permission represents a specific action on a resource.

Generated automatically per entity:

```ts
customer.read
customer.create
customer.update
customer.delete
```

---

### 3.2 Role

A role is a collection of permissions.

Examples:

```ts
admin → all permissions
viewer → read-only
editor → read + create + update
```

---

### 3.3 User Role Assignment

A user can have:

* A **platform role** (global)
* One or more **tenant roles**

---

### 3.4 Platform vs Tenant Roles

#### Platform Role

* Applies globally
* Used for superuser access

Example:

```ts
platform.superadmin
```

---

#### Tenant Role

* Scoped to a specific tenant
* Controls access to tenant data

---

## 4. Deliverable

### 4.1 Permission Generation

From entity:

```ts
customer → [
  "customer.read",
  "customer.create",
  "customer.update",
  "customer.delete"
]
```

---

### 4.2 Role Definition

Initial roles (can be seeded):

```ts
admin:
  - *

editor:
  - *.read
  - *.create
  - *.update

viewer:
  - *.read
```

---

### 4.3 User Role Mapping

Stored in Firestore:

```ts
/users/{userId}

{
  platformRole: "superadmin",
  tenants: {
    tenant_1: ["admin"],
    tenant_2: ["viewer"]
  }
}
```

---

## 5. Functional Requirements

### 5.1 Permission Resolution

At runtime, the system must:

1. Identify user
2. Identify tenant
3. Resolve roles
4. Expand roles → permissions
5. Check if permission exists

---

### 5.2 Permission Matching

Support:

* Exact match (`customer.read`)
* Wildcards (`customer.*`, `*`)

---

### 5.3 Superuser Behavior

If user has:

```ts
platform.superadmin
```

Then:

* Bypass all permission checks
* Full access to all tenants

---

## 6. API Integration

### 6.1 Middleware

Each route must define required permission:

```ts
requirePermission("customer.read")
```

---

### 6.2 Enforcement

Middleware must:

* Extract user + tenantId
* Resolve permissions
* Allow or reject request

---

### 6.3 Example

```ts
GET /api/customer → requires "customer.read"
POST /api/customer → requires "customer.create"
```

---

## 7. UI Integration

The frontend must:

* Hide actions user cannot perform
* Prevent navigation to unauthorized pages

---

### Examples

* No "Create" button if no `create` permission
* Disable edit/delete actions
* Hide routes if no `read` permission

---

## 8. Multi-Tenant Behavior

### Rule

Permissions are evaluated **within tenant context**

---

### Example

User:

```ts
tenant_1 → admin
tenant_2 → viewer
```

Behavior:

* Full access in tenant_1
* Read-only in tenant_2

---

## 9. Package Structure

```ts
/packages
  /rbac
    resolvePermissions.ts
    roleMatcher.ts
    requirePermission.ts
```

---

## 10. Permission Resolver

### Input

```ts
{
  userId,
  tenantId
}
```

---

### Output

```ts
string[] // list of permissions
```

---

## 11. Non-Functional Requirements

### 11.1 Performance

* Cache permissions per request
* Avoid repeated DB calls

---

### 11.2 Security

* Deny by default
* No implicit permissions

---

### 11.3 Simplicity

* Avoid complex hierarchies
* Keep flat permission structure

---

## 12. Inputs / Outputs

### Inputs

* Entity metadata (permissions)
* User role data
* Tenant context

---

### Outputs

* Permission list
* Authorization decision (allow/deny)

---

## 13. Acceptance Criteria

### 13.1 Permission Generation

* All entities generate correct permissions

---

### 13.2 Role Assignment

* Users can be assigned roles per tenant

---

### 13.3 Enforcement

* Unauthorized requests return 403
* Authorized requests succeed

---

### 13.4 Superuser

* Superadmin bypasses all checks

---

### 13.5 UI Adaptation

* UI reflects permissions correctly

---

## 14. Testing & Validation (MANDATORY)

---

### 14.1 API Testing

#### Test Case 1 — Authorized Access

* User with permission → success

---

#### Test Case 2 — Unauthorized Access

* User without permission → 403

---

#### Test Case 3 — Wildcard Roles

* Role with `customer.*` → access all customer endpoints

---

#### Test Case 4 — Superadmin

* Full access across all endpoints

---

---

### 14.2 UI Validation (CRITICAL)

#### Scenario 1 — Viewer User

* Can see list
* Cannot see Create/Edit/Delete buttons

---

#### Scenario 2 — Editor User

* Can create/edit
* Cannot delete (if not allowed)

---

#### Scenario 3 — Tenant Switching

* Switch tenant
* UI updates permissions accordingly

---

#### Scenario 4 — Route Protection

* Try accessing restricted route manually
* Must be blocked

---

---

## 15. Risks & Considerations

### Risk 1: Over-complication

Avoid:

* Nested roles
* Complex inheritance

---

### Risk 2: UI-Only Enforcement

Mitigation:

* Always enforce in API

---

### Risk 3: Performance Bottlenecks

Mitigation:

* Cache permissions per request

---

## 16. Next Iteration (Awareness Only)

Future enhancements:

* Field-level permissions
* Dynamic roles via UI
* Permission audit logs
* Attribute-based access control (ABAC)

Do NOT implement now.

---

## 17. Summary

The RBAC system provides **secure and scalable access control**.

Once implemented, the platform will:

* Enforce permissions across API and UI
* Support multi-tenant role separation
* Enable safe extension of business modules

This is the **security backbone** of the platform and must be implemented carefully.
