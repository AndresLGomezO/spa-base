# 🧩 CARD-BASED FINANCIAL ITEM — FULL SPEC

This describes a **single card component** in a vertical list.

---

# 🧱 1. Layout Structure (React Mental Model)

```tsx
<Card>
  <CardHeader>
    <Icon />
    <TitleBlock />
    <BalanceBlock />
    <MenuButton />
  </CardHeader>

  <CardBody>
    <MetadataRow />
  </CardBody>
</Card>
```

---

# 📐 2. Card Container

### Base Styles (Tailwind-like)

```css
display: flex;
flex-direction: column;
gap: 12px;

padding: 16px;
border-radius: 16px;

background: #ffffff;
border: 1px solid #e5e7eb; /* gray-200 */

box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
transition: all 0.2s ease;
```

---

### Hover State

```css
:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #d1d5db; /* gray-300 */
}
```

👉 Subtle elevation = “clickable + interactive”

---

### Click State (optional)

```css
:active {
  transform: translateY(0px) scale(0.995);
}
```

---

# 🧱 3. Header Layout

### Structure

```tsx
<div className="flex items-center justify-between">
  <LeftSection />
  <RightSection />
</div>
```

---

## 🔹 LEFT SECTION

```tsx
<div className="flex items-center gap-12px">
  <Icon />
  <TitleBlock />
</div>
```

---

### 🟢 Icon

- Size: `40px x 40px`
- Shape: rounded-full
- Background: soft tinted color (based on type)

```css
width: 40px;
height: 40px;
border-radius: 9999px;

display: flex;
align-items: center;
justify-content: center;

background: rgba(15, 118, 110, 0.1); /* primary tint */
color: #0f766e;
```

👉 Icon examples:

- Savings → 💰
- Investment → 📈
- Loan → 🏦

---

### 🟢 Title Block

```tsx
<div className="flex flex-col">
  <span className="name" />
  <span className="subcategory" />
</div>
```

#### Name

```css
font-size: 16px;
font-weight: 600;
color: #111827; /* gray-900 */
```

#### Subtext (Product Type • Category)

```css
font-size: 13px;
color: #6b7280; /* gray-500 */
```

Example:

```
Savings • Emergency Fund
```

---

## 🔹 RIGHT SECTION

```tsx
<div className="flex items-center gap-12px">
  <BalanceBlock />
  <MenuButton />
</div>
```

---

### 💰 Balance Block

```tsx
<div className="flex flex-col items-end">
  <span className="amount" />
  <span className="currency" />
</div>
```

#### Amount

```css
font-size: 18px;
font-weight: 700;
letter-spacing: -0.01em;
```

#### Color Logic

| Type     | Color               |
| -------- | ------------------- |
| Positive | #059669 (green-600) |
| Negative | #dc2626 (red-600)   |
| Neutral  | #111827             |

---

#### Currency (secondary)

```css
font-size: 12px;
color: #9ca3af; /* gray-400 */
```

---

### ⋮ Menu Button (Actions)

- Icon: vertical dots
- Size: 32px clickable area

```css
width: 32px;
height: 32px;
border-radius: 8px;

display: flex;
align-items: center;
justify-content: center;

cursor: pointer;
transition: background 0.15s;
```

#### Hover

```css
:hover {
  background: #f3f4f6; /* gray-100 */
}
```

---

# 🧱 4. Body Section (Metadata Row)

```tsx
<div className="flex flex-wrap gap-x-16px gap-y-4px">
  <MetaItem label="Initial" />
  <MetaItem label="Start Date" />
  <MetaItem label="End Date" />
  <StatusBadge />
</div>
```

---

## 🧾 Meta Item

```tsx
<div className="flex flex-col">
  <span className="label" />
  <span className="value" />
</div>
```

### Label

```css
font-size: 11px;
color: #9ca3af; /* gray-400 */
text-transform: uppercase;
letter-spacing: 0.04em;
```

### Value

```css
font-size: 13px;
color: #374151; /* gray-700 */
font-weight: 500;
```

---

## 🟢 Status Badge

```css
padding: 4px 10px;
border-radius: 9999px;

font-size: 12px;
font-weight: 500;
```

### Variants

```css
.active {
  background: #dcfce7;
  color: #166534;
}

.pending {
  background: #fef3c7;
  color: #92400e;
}

.closed {
  background: #fee2e2;
  color: #991b1b;
}
```

---

# 🧠 5. Responsive Behavior

### Desktop

- Full layout (all metadata visible)

### Mobile

```css
flex-direction: column;
```

Adjustments:

- Balance moves below title OR stays right-aligned
- Metadata wraps into 2 rows
- Hide less critical items (e.g., End Date)

---

# ✨ 6. Micro-Interactions

### Hover Elevation

- `translateY(-2px)`
- stronger shadow

---

### Click → Open Detail Drawer

Trigger:

```tsx
onClick={() => openDetail(itemId)}
```

---

### Menu Interaction

- Click opens dropdown (Edit / Delete)
- Should NOT trigger card click (stopPropagation)

---

### Optional: Subtle Entry Animation

```css
animation: fadeInUp 0.3s ease;
```

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

# 🎨 7. Visual Hierarchy (VERY IMPORTANT)

Priority order:

1. **Balance (largest, boldest)**
2. **Name**
3. **Type + Category**
4. **Metadata**
5. **Description (optional, hidden)**

---

# ⚠️ 8. What NOT to include in the card

❌ Long description (move to detail view)
❌ Too many fields
❌ Horizontal scrolling
❌ Dense text blocks

---

# 🧩 9. Example Tailwind Implementation

```tsx
<div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
        💰
      </div>

      <div>
        <p className="text-gray-900 font-semibold">Emergency Fund</p>
        <p className="text-gray-500 text-sm">Savings • Emergency</p>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-green-600 font-bold">$5,250.75</p>
        <p className="text-xs text-gray-400">USD</p>
      </div>

      <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
        ⋮
      </button>
    </div>
  </div>

  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
    <div>
      <p className="text-gray-400 text-xs uppercase">Initial</p>
      <p className="text-gray-700">$5,000</p>
    </div>

    <div>
      <p className="text-gray-400 text-xs uppercase">Start</p>
      <p className="text-gray-700">Jan 1, 2024</p>
    </div>

    <span className="ml-auto px-3 py-1 text-xs rounded-full bg-green-100 text-green-800">
      Active
    </span>
  </div>
</div>
```

---

# 🚀 Final Outcome

If your team follows this spec, they will build:

- A **clean, modern, finance-grade UI**
- Fully responsive
- Scannable in <2 seconds per item
- Scalable to hundreds of items
