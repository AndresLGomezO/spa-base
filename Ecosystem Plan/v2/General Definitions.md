# PLATFORM ECOSYSTEM — MASTER PLAN (PHASE 1 + PHASE 2)

> **Implementation status (May 2026):** Phase 1 workstreams and Phase 2 capabilities 10.0–10.8 are **partially delivered (v1)**. This document is the **vision spec**. For as-built behavior see [docs/phase-2-platform-handoff.md](../../docs/phase-2-platform-handoff.md), [docs/master-plans.md](../../docs/master-plans.md), and capability guides under `docs/`. Forward work: [docs/next-phase-backlog.md](../../docs/next-phase-backlog.md).

---

## 1. PURPOSE

This platform is designed as a **multi-tenant ecosystem builder**, where businesses can:

* Define their own data models (entities)
* Automatically get CRUD APIs
* Manage permissions and roles
* Render data through a dynamic UI system
* Extend functionality without modifying the core

The goal is to provide a **scalable, modular, no-rewrite architecture** that supports long-term growth into a full platform product.

---

## 2. CORE PRINCIPLES

* **Single ecosystem, multi-tenant**
* **Schema-driven everything (backend + frontend)**
* **Permission-based access (RBAC)**
* **Extensible via modules, not forks**
* **Zero reprocessing required in future phases**

---

## 3. CURRENT ARCHITECTURE (STARTING POINT)

### Frontend

* React (Router v7)
* Firebase Auth (client-side)
* Token stored in session

### Backend

* Fastify API
* Firebase Admin (token + App Check validation)

### Shared

* Types
* Firestore converters
* Schemas
* UI store

---

## 4. PHASE 1 — MINIMUM VIABLE ECOSYSTEM

### Objective

Deliver a fully working platform where:

* Entities can be defined dynamically
* CRUD APIs are auto-generated
* Permissions are enforced
* UI renders entities dynamically
* Roles can be assigned per tenant

---

## 5. PHASE 1 — WORKSTREAMS

---

### 5.1 ENTITY SYSTEM (CORE)

Defines dynamic schemas for business data.

#### Deliverables

* Entity definition schema
* Firestore storage for entity configs
* Field types (string, number, boolean, date, reference)
* Permission generation per entity

#### Output

* Standardized entity metadata usable by API + UI

---

### 5.2 CRUD API GENERATOR (FASTIFY)

Auto-generates endpoints per entity.

#### Deliverables

* Dynamic route registration
* CRUD endpoints:

  * GET /entity
  * GET /entity/:id
  * POST /entity
  * PATCH /entity/:id
  * DELETE /entity/:id
* RBAC enforcement middleware

#### Output

* Fully working API without manual route creation

---

### 5.3 FIRESTORE DATA ACCESS LAYER (DAL)

Abstracts Firestore operations.

#### Deliverables

* Generic CRUD functions
* Schema validation integration
* Tenant isolation enforcement

#### Output

* Safe, reusable DB access layer

---

### 5.4 RBAC SYSTEM (PERMISSION-BASED)

Controls access across system.

#### Deliverables

* Permission model: `entity.action`
* Role → permission mapping
* Middleware for API enforcement
* Frontend permission helpers

#### Output

* Consistent authorization system

---

### 5.5 FRONTEND ENTITY UI (REACT)

Dynamic UI driven by entity schemas.

#### Deliverables

* Generic components:

  * Table
  * Form
  * Detail view
* Schema-driven rendering
* API integration

#### Output

* Zero custom UI needed for basic CRUD

---

### 5.6 ROUTING SYSTEM (FRONTEND)

Dynamic navigation based on entities.

#### Deliverables

* Route generation per entity
* Permission-based route protection
* Tenant-aware navigation

#### Output

* Scalable routing without manual config

---

### 5.7 BASIC ADMIN (ROLES)

Minimal role management system.

#### Deliverables

* Role definitions (Firestore)
* User-role assignments per tenant
* Platform superadmin

#### Output

* Configurable access control

---

## 6. PHASE 1 — SYSTEM CAPABILITIES

After completion, the platform will support:

* Multi-tenant isolation
* Dynamic data modeling
* Automatic APIs
* Permission enforcement (backend + frontend)
* Dynamic UI rendering
* Role assignment

This is a **fully usable internal platform**.

---

## 7. PHASE 1 — VALIDATION CRITERIA

Platform is considered complete when:

1. A new entity can be created (config level)
2. CRUD works without new code
3. Permissions restrict access correctly
4. UI reflects permissions dynamically
5. Different tenants see different data
6. Roles can be changed and take effect immediately

---

## 8. LIMITATIONS (INTENTIONAL)

Phase 1 does NOT include:

* Advanced UI builder
* Complex relationships UI
* Custom workflows
* Analytics
* Marketplace/modules system
* Advanced admin UX

---

## 9. PHASE 2 — EXPANSION PLAN

### Objective

Transform the platform into a **true ecosystem builder**, enabling businesses to customize behavior, relationships, and UI deeply.

---

## 10. PHASE 2 — KEY CAPABILITIES

---

### 10.1 RELATIONAL DATA SYSTEM

#### Goal

Support complex relationships between entities.

#### Features

* One-to-many / many-to-many
* Reverse lookups
* Relation-aware UI (linked records)

---

### 10.2 ADVANCED UI BUILDER

#### Goal

Allow businesses to configure UI without code.

#### Features

* Drag-and-drop layout system
* Configurable views:

  * Tables
  * Cards
  * Dashboards
* Field-level customization

---

### 10.3 MODULE / EXTENSION SYSTEM

#### Goal

Allow external modules to extend platform.

#### Features

* Module registration system
* Ability to:

  * Add entities
  * Add routes
  * Add UI components
* Isolation per module

---

### 10.4 CUSTOM BUSINESS LOGIC (HOOKS)

#### Goal

Allow custom logic execution.

#### Features

* Lifecycle hooks:

  * beforeCreate
  * afterCreate
  * beforeUpdate
* Server-side execution

---

### 10.5 ADVANCED RBAC

#### Goal

More granular and flexible permissions.

#### Features

* Field-level permissions
* Conditional permissions
* Role hierarchy

---

### 10.6 ADMIN DASHBOARD (FULL)

#### Goal

Full platform management UI.

#### Features

* Role editor
* Permission explorer
* Entity builder UI
* Tenant management

---

### 10.7 PERFORMANCE & SCALING

#### Goal

Prepare for production scale.

#### Features

* Firestore indexing strategy
* Query optimization
* Caching layer
* Pagination + filtering engine

---

## 11. PHASE 2 — DELIVERABLE OUTCOME

After Phase 2:

* Businesses can fully configure their systems
* Platform supports real-world SaaS use cases
* Extensions can be added without touching core
* UI becomes customizable and composable

---

## 12. NEXT STEPS (EXECUTION PLAN)

### Step 1 — Implement Phase 1 sequentially

Order:

1. Entity System
2. DAL
3. CRUD API Generator
4. RBAC
5. Frontend Entity UI
6. Routing System
7. Basic Admin

---

### Step 2 — Validate end-to-end

* Create test tenant
* Define entity
* Assign roles
* Perform CRUD via UI
* Validate permissions

---

### Step 3 — Stabilize

* Fix edge cases
* Ensure consistency across layers
* Harden validation

---

### Step 4 — Prepare Phase 2

* Identify gaps from real usage
* Prioritize Phase 2 features
* Define module boundaries

---

## 13. FINAL SUMMARY

This platform evolves in two clear stages:

### Phase 1

* Build the **engine**
* Make it work end-to-end
* Ensure scalability foundation

### Phase 2

* Build the **ecosystem**
* Enable customization
* Unlock extensibility

---

This plan ensures:

* No rework
* Clean architecture
* Long-term scalability
* Product-ready foundation
