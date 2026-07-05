# 🧠 Unified UI Builder Architecture Guide

## 1. 🎯 Purpose

This document defines a **simplified, scalable, and consistent architecture** for the UI builder system, enabling users to:

* Define data models (entities, relations, queries)
* Build UI components (forms, lists, views, widgets)
* Compose full application screens

The goal is to:

* Reduce confusion
* Eliminate duplicated concepts
* Ensure preview = runtime consistency
* Maintain flexibility without hardcoding UI patterns

---

## 2. 🧱 Core Principle

> There is only ONE UI builder.

Everything is built using:

* A **Component Tree**
* A **Layout System**
* A **Data Binding Layer**
* A **Preview Context**

All features (forms, dashboards, lists, metrics, etc.) are simply **different compositions with different preview contexts**.

---

## 3. 🧩 Composition Model

Replace feature-based thinking with composition scopes:

| Type      | Description         | Example                     |
| --------- | ------------------- | --------------------------- |
| Component | Small reusable unit | Input, Text, Metric         |
| Block     | Group of components | Card, Table, Widget         |
| Section   | Layout segment      | Table section, Form section |
| Screen    | Full page           | Dashboard, Entity view      |

👉 All use the same builder. Only scope changes.

---

## 4. 👁️ Preview Context System

Each builder instance must define a `PreviewContext`.

```ts
PreviewContext = {
  type: 'component' | 'block' | 'section' | 'screen',
  constraints: {
    width: 'fixed' | 'fluid' | 'responsive',
    height: 'auto' | 'fixed',
  },
  controls: {
    deviceSwitcher: boolean,
    widthSlider: boolean,
    containerFrame: boolean,
  }
}
```

### Rules

| Context          | Device Switcher | Width Slider | Notes                      |
| ---------------- | --------------- | ------------ | -------------------------- |
| Component/Widget | ❌               | ✅            | Simulate container width   |
| Block/Section    | ❌               | ✅            | Works inside parent layout |
| Screen           | ✅               | ❌            | Full responsive behavior   |

👉 Remove screen selector from everywhere except **Screen context**.

---

## 5. 🧱 Layout System (Critical)

### Single Layout Engine

Use ONE system:

* CSS Grid (primary)
* Flex (secondary, internal use only)

### Rules

* Grid defines **structure**
* Flex is only used **inside components**, not for layout composition
* Avoid mixing `justifyContent` for layout positioning at root level

---

## 6. 🚨 Current Problems & Solutions

### ❌ Problem: Column vs Container confusion

**Solution:**

* Remove “Column” as a concept
* Use:

  * `Container` (no layout rules)
  * `Grid` (defines columns)

👉 A 1-column layout = Grid with 1 column (not a different component)

---

### ❌ Problem: Layout breaking due to styles

**Solution:**

* Separate:

  * **Layout Props** (grid, spacing, alignment)
  * **Style Props** (color, background, border)

👉 Layout must NOT be controlled via arbitrary styles

---

### ❌ Problem: Root container ambiguity

**Solution:**

Every composition must have a **standardized root**:

| Type      | Root Component          |
| --------- | ----------------------- |
| Component | Container               |
| Block     | Container               |
| Section   | Container               |
| Screen    | ScreenRoot (Grid-based) |

👉 Always inject root automatically.

---

### ❌ Problem: Preview ≠ Runtime

**Solution:**

* Use the SAME renderer for both
* No preview-only styles
* No runtime overrides

👉 Preview must be a pure reflection of runtime

---

### ❌ Problem: Screen selector everywhere

**Solution:**

* Only enable for `Screen`
* Replace with:

  * Width slider
  * Min/max constraints

---

### ❌ Problem: Too many tabs / fragmented UX

**Solution:**

Unify all builders into:

### 🔹 Single Builder Layout

* **Left Panel:** Component Tree
* **Center:** Canvas (Preview)
* **Right Panel:** Properties (props + layout + data)

Optional:

* Top bar = context controls (device / width)

👉 Remove feature-specific tabs like:

* “columns”
* “components”
* “layout”

Everything becomes **one editing surface**

---

### ❌ Problem: Presets complexity (data binding issues)

**Solution:**

Split presets into:

#### 1. Layout Presets

* No data binding
* Only structure

#### 2. Component Templates

* Allow placeholders:

  ```ts
  {{entity.field}}
  {{metric.value}}
  ```

👉 Bind data AFTER inserting

---

### ❌ Problem: Hardcoded UI types (table, wizard, cards)

**Solution:**

Replace with:

* Prebuilt **templates**
* Not enforced types

Examples:

* “Table layout” → template
* “Wizard form” → template

👉 Users can modify freely after insertion

---

### ❌ Problem: Container behavior ambiguity

**Decision: YES — enforce neutrality**

Container must:

* ❌ NOT apply layout transformations
* ❌ NOT override children
* ✅ Only act as a wrapper

👉 Layout is defined ONLY by Grid / Layout components

---

## 7. 🧪 Feature Mapping (Your Current System → New Model)

| Current Feature | New Model              |
| --------------- | ---------------------- |
| Dashboard       | Screen                 |
| Sections tab    | Section builder        |
| Layout tab      | Unified builder        |
| Item list       | Block (template-based) |
| Detailed view   | Screen                 |
| Forms           | Section / Screen       |
| Metrics         | Component / Block      |

---

## 8. 🧠 UX Strategy

### Progressive Complexity

#### Level 1 (Default Users)

* Drag & drop templates
* Minimal controls

#### Level 2

* Adjust layout (grid, spacing)

#### Level 3 (Advanced)

* Full component control
* Data binding
* Custom composition

---

## 9. 🚀 Final Rules

1. One builder, multiple contexts
2. One layout system (Grid-first)
3. No feature-specific UI logic
4. Templates instead of hardcoded types
5. Preview = runtime (always)
6. Root is always standardized
7. Layout ≠ Style (never mix)

---

## 10. 🔥 Final Mental Model

> You are building a system closer to:
>
> * Figma (composition)
> * Webflow (layout rules)
>
> But simplified for non-technical users.

---
