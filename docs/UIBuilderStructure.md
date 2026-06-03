You are a senior frontend architect and TypeScript expert specializing in scalable React systems and monorepo architectures.

## Goal

Design and implement a **global, schema-aware UI Builder** for a React Router application. This builder must allow dynamic composition of UI layouts and components, and output a **fully typed, normalized JSON structure** that will be stored in a database and later rendered.

---

## Core Principles

* The builder must be **schema-driven** and **context-aware**
* The output must be **strictly typed, serializable JSON**
* The system must be **extensible, reusable, and composable**
* The builder must support **real-time preview rendering**
* The layout system must be **fully recursive and hierarchical**
* All UI primitives must come from `@repo/ui` (create missing ones if needed)
* The system must be **organized within a scalable monorepo**

---

## Monorepo Architecture

The system must be designed as part of a **modular monorepo**, separating concerns between UI primitives, builder logic, rendering engine, and app integration.

### Suggested Structure

```
/apps
  /web
    /src
      /features
        /ui-builder
          /components        # Builder UI (panels, editors, controls)
          /hooks             # Builder state hooks
          /state             # Zustand/Jotai/Redux store
          /preview           # Live preview integration
          /adapters          # Context adapters (list, form, page)
          index.ts

/packages
  /ui                      # Shared design system (MANDATORY source of primitives)
    /components
      Text.tsx
      Image.tsx
      Badge.tsx
      ...
    /tokens
    /theme

  /ui-builder-core         # 🔥 CORE ENGINE (framework-agnostic if possible)
    /types                 # All TypeScript interfaces (layout, nodes, styles, etc.)
    /schema                # JSON schema definitions
    /builder               # Builder logic (transformations, validations)
    /resolver              # Data binding + fallback resolution
    /conditions            # Conditional logic engine
    /styles                # Style system definitions
    index.ts

  /ui-builder-renderer     # Runtime renderer (used by preview + production)
    /components            # Renderer wrappers for @repo/ui
    /layout                # Recursive layout renderer
    /engine                # Render orchestration
    index.ts

  /ui-builder-react        # React-specific builder implementation
    /builder-ui            # Panels, editors, controls
    /preview               # Live preview (uses renderer)
    /context               # Schema + data providers
    index.ts

  /schemas                 # Shared Zod schemas for entities
    /entityA.ts
    /entityB.ts

  /types                   # Shared domain types

---

## Responsibilities by Package

### @repo/ui
- Source of truth for all UI primitives
- No business logic
- Fully theme-aware

---

### ui-builder-core (CRITICAL)

Framework-agnostic engine that defines:

- Recursive layout model
- JSON schema structure ([UIBuilderOutputJSON.md](./UIBuilderOutputJSON.md) — full output spec)
- TypeScript types
- Validation logic
- Data binding resolution
- Fallback chains
- Conditional styling rules

This package must NOT depend on React.

---

### ui-builder-renderer

- Consumes JSON output from builder
- Renders UI using `@repo/ui`
- Handles:
  - Recursive layout traversal
  - Component instantiation
  - Style application
  - Conditional logic execution
  - Fallback resolution

Used by:
- Preview
- Production UI rendering

---

### ui-builder-react

- React implementation of the builder UI
- Handles:
  - Drag/drop or structured editing
  - Component configuration panels
  - Schema-aware field selectors
  - Style editors
  - Conditional rule editors
- Integrates with:
  - `ui-builder-core`
  - `ui-builder-renderer` (for preview)

---

### apps/web (Integration Layer)

- Uses builder in:
  - Entity pages
  - List views
  - Forms (create/update)

- Provides:
  - Entity data
  - Zod schemas
  - Context adapters

---

## Context Adapters

Adapters normalize inputs for the builder:

### Examples
- `entityViewAdapter`
- `entityListItemAdapter`
- `entityFormAdapter`

Each adapter provides:
- Available fields
- Field metadata (type, label, formatting hints)
- Data access paths

---

## Layout System (Recursive Grid Engine)

- Columns contain rows
- Rows can contain:
  - Components
  - OR nested columns (NEW)
- Fully recursive

---

## Component System

- Only uses `@repo/ui`
- Schema-aware configuration
- Type-filtered field selection

---

## Styling, Fallbacks, Conditional Logic

Handled centrally in:
- `ui-builder-core`

Applied during rendering in:
- `ui-builder-renderer`

---

## Preview System

- Implemented in `ui-builder-react`
- Uses `ui-builder-renderer`
- Must be identical to production rendering

---

## Output Expectation

Produce:

1. Monorepo-aware architecture explanation
2. Folder-level responsibilities
3. TypeScript interfaces (core package)
4. JSON schema structure
5. Renderer architecture
6. Builder UI architecture
7. Data flow between packages
8. Example end-to-end flow:
   - Schema → Builder → JSON → Renderer → UI

Avoid vague explanations. Be concrete, structured, and implementation-ready.
```
