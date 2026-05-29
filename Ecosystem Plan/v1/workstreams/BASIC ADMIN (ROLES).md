# Workstream 7 — BASIC ADMIN (ROLES MANAGEMENT)

## 1. Overview

The Basic Admin module provides the minimum required functionality to manage:

* Roles
* Permissions
* User-role assignments

This module enables the platform to be **operational without manual database edits**, allowing a superuser to configure access control through the UI (or minimal seeded configuration).

This is a **foundational admin capability**, not a full-featured admin panel.

---

## 2. Objective

Provide a minimal but functional system that allows:

* Defining roles and their permissions
* Assigning roles to users per tenant
* Supporting platform-level superuser control
* Enabling RBAC system (Workstream 4) to operate dynamically

---

## 3. Scope

### Included

* Role definitions (stored in Firestore)
* User-role assignments (per tenant)
* Basic UI or seed-based configuration
* Platform superadmin support

---

### Not Included (Phase 2+)

* Advanced UI for role editing
* Permission grouping UI
* Audit logs
* Role templates marketplace

---

## 4. Core Concepts

### 4.1 Role

A role is a collection of permissions:

```ts id="8v9bqz"
{
  name: "editor",
  permissions: [
    "customer.read",
    "customer.create",
    "customer.update"
  ]
}
```

---

### 4.2 User Assignment

A user can have roles per tenant:

```ts id="v7k3tf"
{
  userId: "user_123",
  tenantId: "tenant_1",
  roles: ["editor"]
}
```

---

### 4.3 Platform Superadmin

Stored on user document:

```ts id="4b3q2y"
{
  userId: "user_1",
  platformRole: "superadmin"
}
```

---

## 5. Data Model (Firestore)

### 5.1 Roles Collection

```id="xyb5h1"
/roles/{roleId}

{
  name: string,
  permissions: string[],
  tenantId: string | null // null = global role
}
```

---

### 5.2 User Roles Mapping

Option A (recommended for Phase 1 simplicity):

```id="xjv1q8"
/users/{userId}

{
  platformRole: string | null,
  tenants: {
    [tenantId]: string[] // role names
  }
}
```

---

## 6. Deliverables

### 6.1 Seed Roles

Provide initial roles:

```ts id="g2kqaz"
admin → ["*"]
editor → ["*.read", "*.create", "*.update"]
viewer → ["*.read"]
```

---

### 6.2 Role Assignment Mechanism

* Assign roles to users per tenant
* Persist in Firestore

---

### 6.3 Minimal Admin Interface (OPTIONAL UI)

At minimum, one of:

#### Option A (Preferred for Phase 1)

* Seed data + manual Firestore editing

#### Option B (If UI included)

* Simple page:

  * List users
  * Assign roles per tenant

---

## 7. Functional Requirements

### 7.1 Role Resolution

RBAC system must:

* Fetch user roles
* Expand to permissions
* Apply per tenant

---

### 7.2 Role Assignment

* Must support multiple roles per user per tenant
* Must override correctly when changed

---

### 7.3 Platform Role

* If `superadmin`:

  * Full access across all tenants
  * Bypass RBAC checks

---

## 8. UI Requirements (If Implemented)

### 8.1 User List

* Display users (basic info)

---

### 8.2 Role Assignment UI

* Select tenant
* Assign roles to user

---

### 8.3 Constraints

* No complex UI required
* Focus on functionality, not UX perfection

---

## 9. Integration Points

### With RBAC (Workstream 4)

* Provides role → permission mapping

---

### With API (Workstream 2)

* Permissions enforced per request

---

### With UI (Workstream 5)

* Permissions determine visible actions

---

## 10. Non-Functional Requirements

### 10.1 Simplicity

* Keep implementation minimal
* Avoid overengineering

---

### 10.2 Consistency

* Role structure must align with RBAC system

---

### 10.3 Security

* Only superadmin can assign roles (Phase 1 assumption)

---

## 11. Inputs / Outputs

### Inputs

* Entity-generated permissions
* User data (Firebase Auth)
* Tenant context

---

### Outputs

* Role definitions
* User-role assignments
* Permission resolution data

---

## 12. Acceptance Criteria

### 12.1 Role Definitions

* Roles exist and are accessible

---

### 12.2 User Assignment

* Users can be assigned roles per tenant

---

### 12.3 RBAC Integration

* Permissions derived from roles correctly

---

### 12.4 Superadmin

* Full access across system

---

### 12.5 Persistence

* Role changes persist in Firestore

---

## 13. Testing & Validation (MANDATORY)

---

### 13.1 Role Assignment Testing

#### Scenario

* Assign "viewer" role to user
* Verify:

  * Only read access allowed

---

### 13.2 Role Change Testing

#### Scenario

* Change role from viewer → editor
* Verify:

  * New permissions apply immediately

---

---

### 13.3 Multi-Tenant Testing

#### Scenario

* Same user:

  * Tenant A → admin
  * Tenant B → viewer

Verify:

* Different behavior per tenant

---

---

### 13.4 Superadmin Testing

#### Scenario

* Assign platformRole = superadmin
* Verify:

  * Full access everywhere
  * No restrictions

---

---

### 13.5 UI Validation (CRITICAL)

If admin UI is implemented:

#### Scenario 1 — Assign Role

* Assign role via UI
* Refresh app
* Permissions update

---

#### Scenario 2 — Permission Reflection

* After role change:

  * UI updates (buttons, routes, etc.)

---

#### Scenario 3 — Access Control

* Non-superadmin tries to access admin UI
* Must be blocked

---

---

## 14. Risks & Considerations

### Risk 1: Hardcoding Roles

Mitigation:

* Store roles in DB or seed system

---

### Risk 2: Inconsistent Permissions

Mitigation:

* Always derive from entity system

---

### Risk 3: Overbuilding Admin UI

Mitigation:

* Keep UI minimal for Phase 1

---

## 15. Next Iteration (Awareness Only)

Future enhancements:

* Full admin dashboard
* Role creation/editing UI
* Permission explorer UI
* Audit logs
* Role templates per business

Do NOT implement now.

---

## 16. Summary

This workstream enables the platform to be **operational and configurable**.

Once completed:

* Roles can be assigned dynamically
* Permissions flow correctly through the system
* Multi-tenant access control is fully functional

This completes the **minimum viable platform ecosystem for Phase 1**.
