# Workstream 6 — ROUTING SYSTEM (FRONTEND)

## 1. Overview

The Routing System defines how users navigate through the platform and how entity-driven pages are exposed in the UI.

This system must:

* Dynamically generate routes based on entity definitions
* Enforce authentication and authorization (RBAC)
* Support tenant-aware navigation
* Integrate with the existing React Router v7 setup

The routing layer is responsible for turning the platform into a **navigable application**.

---

## 2. Objective

Build a routing system that:

* Automatically registers routes for all entities
* Protects routes based on authentication and permissions
* Supports tenant context switching
* Integrates seamlessly with the layout (sidebar, main view)

---

## 3. Core Concepts

### 3.1 Entity Routes

Each entity must automatically expose:

```tsx id="m2s9c1"
/app/{entity}
/app/{entity}/new
/app/{entity}/:id
```

---

### 3.2 Route Types

| Route             | Purpose     |
| ----------------- | ----------- |
| /app/{entity}     | List view   |
| /app/{entity}/new | Create form |
| /app/{entity}/:id | Edit form   |

---

### 3.3 Route Protection Layers

1. Authentication (user must be logged in)
2. Tenant context (tenant must be selected)
3. Authorization (RBAC permissions)

---

## 4. Deliverables

### 4.1 Dynamic Route Registration

Routes generated from entity list:

```tsx id="js0zpd"
entities.map(entity => registerEntityRoutes(entity))
```

---

### 4.2 Route Guards

* Auth guard
* Tenant guard
* Permission guard

---

### 4.3 Layout Integration

* Sidebar navigation
* Main content rendering
* Active route highlighting

---

## 5. Functional Requirements

### 5.1 Authentication Guard

* Redirect unauthenticated users to login
* Use existing Firebase auth state

---

### 5.2 Tenant Guard

* Ensure a tenant is selected
* Redirect or block if no tenant context

---

### 5.3 Permission Guard

Each route must enforce:

| Route  | Required Permission |
| ------ | ------------------- |
| List   | entity.read         |
| Create | entity.create       |
| Edit   | entity.update       |

---

### 5.4 Route Registration Logic

Example:

```tsx id="90ghxf"
<Route path="/app/customer" element={<EntityPage entity="customer" />} />
<Route path="/app/customer/new" element={<EntityForm entity="customer" />} />
<Route path="/app/customer/:id" element={<EntityForm entity="customer" />} />
```

---

## 6. Navigation System

### 6.1 Sidebar

* Dynamically list all accessible entities
* Filter based on `read` permission

---

### 6.2 Navigation Rules

* Only show entities user can access
* Highlight active route
* Support navigation between entities

---

## 7. Tenant Awareness

### 7.1 Tenant Context

* Stored in global state (UI store)
* Used in all routes

---

### 7.2 Behavior

* Switching tenant updates:

  * Available routes
  * Permissions
  * Visible data

---

## 8. Component Structure

```bash id="nyq2x2"
/apps/web
  /routes
    AppRouter.tsx
    EntityRoutes.tsx
    RouteGuards.tsx
```

---

## 9. Route Guards Implementation

### 9.1 AuthGuard

* Checks Firebase auth state
* Redirects to login if needed

---

### 9.2 TenantGuard

* Ensures tenantId exists
* Redirects to tenant selection if needed

---

### 9.3 PermissionGuard

```tsx id="rnf1px"
<PermissionGuard permission="customer.read">
  <EntityPage entity="customer" />
</PermissionGuard>
```

---

## 10. Non-Functional Requirements

### 10.1 Scalability

* Must handle many entities without manual configuration

---

### 10.2 Performance

* Avoid unnecessary re-renders
* Lazy load routes if needed

---

### 10.3 Maintainability

* Centralized routing logic
* Clear separation of concerns

---

## 11. Inputs / Outputs

### Inputs

* Entity list
* User authentication state
* User permissions
* Tenant context

---

### Outputs

* Registered routes
* Navigation structure
* Protected views

---

## 12. Acceptance Criteria

### 12.1 Route Availability

* Routes generated for all entities

---

### 12.2 Protection

* Unauthorized users cannot access protected routes

---

### 12.3 Navigation

* Sidebar reflects accessible entities

---

### 12.4 Tenant Switching

* Routes and data update correctly

---

### 12.5 Integration

* Works with Entity UI components

---

## 13. Testing & Validation (MANDATORY)

---

### 13.1 UI Navigation Testing

#### Scenario 1 — Entity Navigation

* Click entity in sidebar
* Route loads correct page

---

#### Scenario 2 — Create Route

* Navigate to `/new`
* Form loads correctly

---

#### Scenario 3 — Edit Route

* Navigate to `/:id`
* Record loads correctly

---

---

### 13.2 Auth Guard Testing

#### Scenario

* Logout user
* Try accessing `/app/customer`
* Must redirect to login

---

---

### 13.3 Permission Guard Testing

#### Scenario 1 — No Access

* User without `read`
* Cannot access route

---

#### Scenario 2 — Partial Access

* User without `create`
* Cannot access `/new`

---

---

### 13.4 Sidebar Validation

#### Scenario

* Login as different roles
* Sidebar updates:

  * Viewer → limited entities
  * Admin → all entities

---

---

### 13.5 Tenant Switching Validation

#### Scenario

* Switch tenant
* Verify:

  * Routes still accessible
  * Data changes
  * Permissions updated

---

---

### 13.6 Error Handling

* Invalid route → show 404 or fallback page

---

---

## 14. Risks & Considerations

### Risk 1: Route Explosion

Mitigation:

* Use dynamic registration

---

### Risk 2: Inconsistent Guards

Mitigation:

* Centralize guard logic

---

### Risk 3: UX Confusion

Mitigation:

* Hide inaccessible routes in UI

---

## 15. Next Iteration (Awareness Only)

Future improvements:

* Nested routes
* Breadcrumbs
* Deep linking with filters
* Route-based layouts
* Module-based routing (extensions)

Do NOT implement now.

---

## 16. Summary

The Routing System enables:

* Seamless navigation across the platform
* Secure access control at the UI level
* Dynamic scaling as entities grow

Once implemented, the platform becomes a **fully navigable, permission-aware application**, ready for business usage.
