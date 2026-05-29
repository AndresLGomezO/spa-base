# Workstream 5 — FRONTEND ENTITY UI (REACT)

## 1. Overview

The Frontend Entity UI is responsible for rendering dynamic, data-driven interfaces based on entity definitions.

This layer transforms the platform into a **usable product**, allowing users to:

* View data (tables)
* Create and edit records (forms)
* Interact with entities without custom UI per business

The UI must be:

* Schema-driven (based on Entity System)
* Permission-aware (RBAC integrated)
* Tenant-aware
* Reusable and extensible

---

## 2. Objective

Build a generic UI system that:

* Automatically renders CRUD interfaces for any entity
* Uses shared schemas for validation
* Integrates with API layer
* Adapts to user permissions
* Provides a clean and consistent UX

---

## 3. Core Components

### 3.1 EntityTable

Displays a list of records.

```tsx
<EntityTable entity="customer" />
```

---

### 3.2 EntityForm

Handles create and edit operations.

```tsx
<EntityForm entity="customer" />
```

---

### 3.3 EntityPage (Wrapper)

Combines table + actions:

```tsx
<EntityPage entity="customer" />
```

---

## 4. Deliverables

### 4.1 Table View

Features:

* List records
* Pagination (basic)
* Loading state
* Empty state
* Error handling

---

### 4.2 Form View

Features:

* Create and edit modes
* Field rendering based on schema
* Validation (shared with backend)
* Submit handling

---

### 4.3 Actions

* Create
* Edit
* Delete

Controlled via RBAC

---

## 5. Functional Requirements

### 5.1 Schema-Driven Rendering

Fields must be rendered based on entity definition:

| Type    | UI Component |
| ------- | ------------ |
| string  | Input        |
| number  | Number input |
| boolean | Checkbox     |
| date    | Date picker  |

---

### 5.2 Validation

* Use shared schema (Zod)
* Validate before submit
* Display field errors

---

### 5.3 API Integration

Use CRUD endpoints:

```ts
GET /api/{entity}
POST /api/{entity}
PUT /api/{entity}/:id
DELETE /api/{entity}/:id
```

---

### 5.4 State Management

* Handle loading, success, error states
* Sync with API responses

---

## 6. RBAC Integration (CRITICAL)

### 6.1 UI Behavior Based on Permissions

| Permission | UI Behavior          |
| ---------- | -------------------- |
| read       | Show table           |
| create     | Show "Create" button |
| update     | Enable edit          |
| delete     | Enable delete        |

---

### 6.2 Enforcement

* Hide restricted actions
* Disable controls if needed
* Do NOT rely only on UI (API enforces too)

---

## 7. Multi-Tenant Behavior

* UI must operate within current tenant context
* All API calls scoped automatically

---

### Example

* Tenant A → sees only its data
* Tenant B → completely separate view

---

## 8. Routing Integration

Routes (used by Workstream 6):

```tsx
/app/{entity}
/app/{entity}/new
/app/{entity}/:id
```

---

## 9. Component Structure

```bash
/apps/web
  /components
    /entity
      EntityTable.tsx
      EntityForm.tsx
      EntityPage.tsx
  /hooks
    useEntity.ts
    usePermissions.ts
```

---

## 10. Hooks

### 10.1 useEntity

Handles:

* Fetching data
* Creating/updating/deleting

---

### 10.2 usePermissions

Returns:

```ts
{
  canRead,
  canCreate,
  canUpdate,
  canDelete
}
```

---

## 11. UX Requirements

### 11.1 Loading States

* Show spinner or skeleton

---

### 11.2 Empty State

* Show "No data available"

---

### 11.3 Error Handling

* Display API errors clearly

---

### 11.4 Feedback

* Show success messages after actions

---

## 12. Non-Functional Requirements

### 12.1 Reusability

* No hardcoded entity logic
* Fully dynamic

---

### 12.2 Performance

* Avoid unnecessary re-renders
* Efficient data fetching

---

### 12.3 Consistency

* Same UI behavior across all entities

---

## 13. Inputs / Outputs

### Inputs

* Entity metadata
* API endpoints
* User permissions
* Tenant context

---

### Outputs

* Rendered UI
* API interactions
* User actions (CRUD)

---

## 14. Acceptance Criteria

### 14.1 Table

* Displays data correctly
* Pagination works

---

### 14.2 Form

* Can create and edit records
* Validation works

---

### 14.3 Permissions

* UI reflects RBAC rules
* Restricted actions hidden

---

### 14.4 Integration

* API and UI fully connected
* Data flows correctly

---

## 15. Testing & Validation (MANDATORY)

---

### 15.1 UI Functional Testing

#### Scenario 1 — List View

* Navigate to entity page
* Data loads correctly

---

#### Scenario 2 — Create Record

* Click "Create"
* Fill form
* Submit
* Record appears in list

---

#### Scenario 3 — Validation

* Submit invalid data
* Errors shown per field

---

#### Scenario 4 — Edit Record

* Edit existing record
* Changes persist

---

#### Scenario 5 — Delete Record

* Delete record
* Removed from list and DB

---

---

### 15.2 RBAC UI Testing

#### Viewer User

* Can view list
* Cannot see Create/Edit/Delete

---

#### Editor User

* Can create/edit
* Cannot delete (if not allowed)

---

#### Admin User

* Full access

---

---

### 15.3 Multi-Tenant Validation

#### Scenario

* Login as Tenant A → create data
* Switch to Tenant B → data not visible

---

---

### 15.4 Error Handling

* Simulate API failure
* UI shows proper error message

---

---

## 16. Risks & Considerations

### Risk 1: Over-customization

Avoid:

* Per-entity UI logic
* Custom components per entity

---

### Risk 2: Schema/UI Mismatch

Mitigation:

* Always use shared schema

---

### Risk 3: Poor UX

Mitigation:

* Keep UI simple and consistent

---

## 17. Next Iteration (Awareness Only)

Future enhancements:

* Custom field components
* Layout configuration
* Advanced filters/search
* Inline editing
* Bulk actions

Do NOT implement now.

---

## 18. Summary

The Frontend Entity UI is what makes the platform **usable and scalable**.

Once complete, the system will:

* Render dynamic CRUD interfaces automatically
* Enforce permissions visually
* Enable rapid business application development

This transforms your platform from backend infrastructure into a **real product ecosystem**.
