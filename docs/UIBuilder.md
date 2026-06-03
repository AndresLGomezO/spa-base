You are a senior frontend architect and TypeScript expert specializing in scalable React systems.

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

---

## Inputs

The builder operates in different contexts and receives different inputs:

### 1. Entity Page / List View

* Receives:

  * Entity data (object or list of objects)
  * Zod schema definition (optional but recommended)

### 2. Create Form

* Receives:

  * Zod schema only

### 3. Update Form

* Receives:

  * Zod schema
  * Entity data

---

## Output

The builder must generate a **fully typed JSON configuration** representing the UI layout.

Requirements:

* Deterministic structure
* Fully serializable
* Supports deeply nested layouts
* Encodes:

  * Layout (columns, rows, nested structures)
  * Components
  * Data bindings
  * Styles
  * Conditional logic
  * Fallback logic

---

## Layout System (Recursive Grid Engine)

### Key Concept

The layout system is **fully recursive**, meaning:

* Columns can contain rows
* Rows can contain:

  * Components
  * OR nested column structures
* Therefore, **any node can branch into a new layout level**

---

## Root Structure

* A main container with:

  * Configurable number of columns (default = 1, up to N)
  * UI controls:

    * Add/remove columns
    * Reorder columns (arrows)
    * Delete columns (bin)

---

## Columns

Each column contains:

* A list of **row nodes**

Each column supports:

* Styling
* Reordering
* Deletion

---

## Rows (Now Enhanced)

Each row is a **flexible container node** that can represent:

### Row Types

1. **Component Row**

   * Contains a renderable UI component

2. **Nested Layout Row (NEW)**

   * Contains a **new column structure**
   * Enables splitting a row into multiple columns

---

## Row Behavior

When adding a row, the builder must prompt:

* Select row type:

  * "Component"
  * "Split into columns"

### If "Component":

* Show component selector
* Show schema-aware configuration options

### If "Split into columns":

* Show:

  * Column count selector (1 → N)
  * Same controls as root columns:

    * Reorder
    * Delete
* Each nested column behaves identically to root columns:

  * Contains rows
  * Can recursively nest again

---

## Resulting Capability

This enables layouts like:

* Column → Row → Columns → Row → Columns → Component
* Fully dynamic grid compositions similar to advanced layout builders

---

## Component System

### Component Source

* Components must come from `@repo/ui`
* If missing, define new primitives

### Supported Types (initial)

* Text
* Image
* Date
* Numeric
* Badge (example with conditional styles)

---

## Component Configuration

Each component must support:

### Data Source Selection

* Field-based (from schema)
* Static value (free text / URL / etc.)

### Schema Awareness

* Show only valid fields based on type:

  * Text → string fields
  * Image → image fields
  * Date → date fields
  * Numeric → numeric fields (with metadata: currency, percentage, etc.)

---

## Label System

* Option to display a label for any field

### Default Label Generation

* Auto-transform field paths:

  * `entity.amount` → "Amount"
  * `entity.openDate` → "Open Date"

### Label Options

* Position (top / bottom)
* Style (bold, thin, italic, underline)
* Color (theme tokens)
* Alignment (left, center, right)
* Custom override (free text)

---

## Styling System

Each node in the layout can be styled:

* Root
* Column
* Row
* Component

### Behavior

* Add multiple style rules dynamically

### Style Structure

* Style key (selected from predefined list)
* Value (manual input or token-based)

### Examples

* Background color (theme token)
* Margin / padding
* Typography styles
* Text color

### Requirement

* Styles must be stored as structured data (NOT raw CSS strings)

---

## Fallback System

All components must support **multi-level fallback chains**.

### Behavior

* Primary source
* N fallback sources:

  * Other fields
  * Static values

### Image Example

1. `entity.bank.logo`
2. → `entity.provider.logo`
3. → `entity.customImage.logo`
4. → default schema image

### Text Example

1. Field value
2. → fallback field
3. → static value ("No data")

---

## Conditional Styling

Components support **value-based conditional styles**.

### Example

* Badge component bound to `entity.status`

Rules:

* "ACTIVE" → background = "success"
* "CLOSED" → background = "danger"

### Requirements

* Declarative rule system
* Based on field values
* Uses theme tokens

---

## Preview System

* Real-time rendering
* Reflects:

  * Layout recursion
  * Data bindings
  * Fallback chains
  * Conditional styles
* Uses same rendering engine as production

---

## Developer Expectations

* Strict TypeScript typing
* Define interfaces for:

  * Layout nodes (recursive)
  * Components
  * Styles
  * Conditions
* Strong separation between:

  * Builder state
  * Render engine
* Ensure deep recursion is safe and performant

---

## Output Expectation

Produce:

1. Recursive layout architecture
2. TypeScript types/interfaces for all node types
3. JSON schema for layout representation
4. Component registry design
5. Rendering engine strategy (builder + preview)
6. Extensibility strategy for future layout patterns

Avoid vague explanations. Be concrete, structured, and implementation-ready.
