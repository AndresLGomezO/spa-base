# 🧭 PHASE 1 — FOUNDATION PLATFORM (Schema-driven CRUD + RBAC)

## 🎯 Main Objective

Deliver a **fully functional vertical slice** where:

* A developer defines an **Entity**
* The platform automatically provides:

  * CRUD API (Fastify)
  * UI (React)
  * RBAC permissions (per entity/action)
* Users can:

  * Log in
  * Access UI
  * Perform CRUD based on permissions

---

# 🧱 Scope (What is INCLUDED)

### ✅ Backend

* Entity definition system
* CRUD generator (Fastify)
* RBAC middleware (permission-based)
* Firestore persistence layer

### ✅ Frontend

* Dynamic entity-driven UI:

  * Table (list view)
  * Form (create/edit)
* Route system for entities
* Auth integration (already done)

### ✅ Shared

* Schema definition (Zod or similar)
* Type-safe contracts (shared packages)

---

# ❌ Out of Scope (Phase 2+)

* Advanced relations (only basic optional reference)
* Complex queries (aggregation, joins)
* Workflow engine
* Custom UI overrides (basic only)
* Multi-tenant UI switching (backend can prepare for it)

---

# 🏗️ Architecture Overview

```id="o6p1ls"
[ Entity Definition ]
        ↓
[ Platform Core ]
   ├── API Generator (Fastify)
   ├── RBAC Engine
   ├── Firestore DAL
        ↓
[ React UI Engine ]
   ├── Table
   ├── Form
   ├── Routing
```

---

# 🧩 Workstreams

---

## 1. ENTITY SYSTEM (CORE FOUNDATION)

### 🎯 Objective

Create a standard way to define business data models.

---

### 📦 Deliverable

```ts
defineEntity({
  name: "customer",

  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    age: { type: "number" }
  }
})
```

---

### 🔧 Requirements

* Field types:

  * string
  * number
  * boolean
  * date
* Validation via Zod
* Metadata:

  * required
  * default values

---

### 📥 Inputs

* Entity config (TS object)

### 📤 Outputs

* Zod schema
* TypeScript types
* Metadata for UI + API

---

### ✅ Validation Criteria

* Can define at least 2 entities
* Invalid data is rejected (API + UI)
* Types are inferred correctly across packages

---

---

## 2. CRUD API GENERATOR (FASTIFY)

### 🎯 Objective

Automatically expose CRUD endpoints per entity.

---

### 📦 Deliverable

For entity `customer`:

```id="rjsr1r"
GET    /api/customer
GET    /api/customer/:id
POST   /api/customer
PUT    /api/customer/:id
DELETE /api/customer/:id
```

---

### 🔧 Requirements

* Input validation (Zod)
* Standard response format
* Pagination (basic: limit + cursor or offset)
* Error handling

---

### 📥 Inputs

* Entity definition

### 📤 Outputs

* Fastify routes
* Typed request/response contracts

---

### ✅ Validation Criteria

* CRUD works end-to-end via Postman
* Validation errors are consistent
* Firestore documents created correctly

---

---

## 3. FIRESTORE DATA ACCESS LAYER (DAL)

### 🎯 Objective

Standardize all DB interactions.

---

### 📦 Deliverable

```ts
CustomerRepository.create(data)
CustomerRepository.findAll()
CustomerRepository.update(id, data)
CustomerRepository.delete(id)
```

---

### 🔧 Requirements

* Use your existing converters
* Collection per entity
* Typed documents

---

### 📥 Inputs

* Entity definition

### 📤 Outputs

* Repository instance per entity

---

### ✅ Validation Criteria

* No direct Firestore calls outside DAL
* Data matches schema
* Easy to swap later (design check)

---

---

## 4. RBAC SYSTEM (PERMISSION-BASED)

### 🎯 Objective

Control access per entity + action.

---

### 📦 Deliverable

Auto-generated permissions:

```id="i7af9c"
customer.read
customer.create
customer.update
customer.delete
```

---

### 🔧 Requirements

* Permission middleware in Fastify
* User permissions resolved from roles
* Basic role model (hardcoded or seeded)

---

### 📥 Inputs

* Entity definitions
* Role definitions

### 📤 Outputs

* Permission checks per route

---

### ✅ Validation Criteria

* User without permission → 403
* User with permission → success
* Works per endpoint

---

---

## 5. FRONTEND ENTITY UI (REACT)

### 🎯 Objective

Render UI automatically from entity definition.

---

## 📦 Deliverables

### 🔹 Table View

```tsx
<EntityTable entity="customer" />
```

Features:

* list
* pagination
* basic filters

---

### 🔹 Form View

```tsx
<EntityForm entity="customer" />
```

Features:

* create/edit
* validation
* submit

---

---

### 🔧 Requirements

* Use shared schema for validation
* Connect to API
* Loading + error states

---

### 📥 Inputs

* Entity metadata
* API endpoints

### 📤 Outputs

* Functional UI pages

---

### ✅ Validation Criteria

* Can create/edit/delete records from UI
* Validation matches backend
* UI reflects permission restrictions

---

---

## 6. ROUTING SYSTEM (FRONTEND)

### 🎯 Objective

Auto-register entity routes.

---

### 📦 Deliverable

```id="znp8nu"
/app/customer
/app/customer/new
/app/customer/:id
```

---

### 🔧 Requirements

* Route protection (auth required)
* Permission-based rendering (hide UI if no access)

---

### 📥 Inputs

* Entity list

### 📤 Outputs

* Routes in React Router v7

---

### ✅ Validation Criteria

* Routes accessible only if permitted
* Navigation works from sidebar

---

---

## 7. BASIC ADMIN (ROLES)

### 🎯 Objective

Assign roles to users.

---

### 📦 Deliverable

* Simple UI or seed config:

  * Users → roles
  * Roles → permissions

---

### 🔧 Requirements

* Can be minimal (JSON or Firestore seed)
* No need for full UI yet

---

### 📥 Inputs

* Users (Firebase)
* Roles config

### 📤 Outputs

* User → permissions mapping

---

### ✅ Validation Criteria

* Changing role affects access immediately
* Works across API + UI

---

---

# 🧪 END-TO-END VALIDATION (CRITICAL)

Create 2 test users:

### 👤 User A (viewer)

* customer.read

### 👤 User B (editor)

* full access

---

## Test Cases

| Action    | Viewer | Editor |
| --------- | ------ | ------ |
| View list | ✅      | ✅      |
| Create    | ❌      | ✅      |
| Edit      | ❌      | ✅      |
| Delete    | ❌      | ✅      |

---

---

# 📦 FINAL DELIVERABLE OF PHASE 1

You should be able to:

```ts
defineApp({
  entities: [Customer, Order]
})
```

Run the app and get:

* Working API
* Working UI
* RBAC enforced
* Firestore persistence

---

# 🚀 PHASE 2 (NEXT STEPS)

After this is stable:

---

## 🔗 1. Relations

* one-to-many
* foreign keys
* relation UI

---

## 🔍 2. Advanced Query Engine

* filters
* sorting
* search

---

## 🎨 3. UI Customization

* override fields/components
* layout control

---

## 🏢 4. Multi-Tenancy

* tenant isolation
* tenant-aware queries

---

## ⚙️ 5. Module System (non-CRUD logic)

* workflows
* background jobs
* integrations

---

## 🔔 6. Events System

* entity.created
* entity.updated

---

# ⚡ Final Advice to Your Team

* Don’t over-generalize early
* Build **one entity fully working end-to-end first**
* Then generalize