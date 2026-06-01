## 🔹 GENERIC TYPE / ENUM MODELS (Reference Tables)

### **ProductType**

| Field       | Type   | Required | Sensitive | Example                |
| ----------- | ------ | -------- | --------- | ---------------------- |
| id          | UUID   | ✅       | ❌        | `ptype_loan`           |
| code        | string | ✅       | ❌        | `LOAN`                 |
| name        | string | ✅       | ❌        | `"Loan"`               |
| description | text   | ❌       | ❌        | `"Debt-based product"` |

### **Frequency**

| Field         | Type    | Required | Sensitive | Example        |
| ------------- | ------- | -------- | --------- | -------------- |
| id            | UUID    | ✅       | ❌        | `freq_monthly` |
| code          | string  | ✅       | ❌        | `MONTHLY`      |
| days_interval | integer | ❌       | ❌        | `30`           |

### **Status**

| Field | Type   | Required | Sensitive | Example         |
| ----- | ------ | -------- | --------- | --------------- |
| id    | UUID   | ✅       | ❌        | `status_active` |
| code  | string | ✅       | ❌        | `ACTIVE`        |

### **RateType**

| Field | Type   | Required | Sensitive | Example      |
| ----- | ------ | -------- | --------- | ------------ |
| id    | UUID   | ✅       | ❌        | `rate_fixed` |
| code  | string | ✅       | ❌        | `FIXED`      |

### **CompoundingFrequency**

| Field | Type   | Required | Sensitive | Example        |
| ----- | ------ | -------- | --------- | -------------- |
| id    | UUID   | ✅       | ❌        | `comp_monthly` |
| code  | string | ✅       | ❌        | `MONTHLY`      |

### **AmortizationType**

| Field | Type   | Required | Sensitive | Example        |
| ----- | ------ | -------- | --------- | -------------- |
| id    | UUID   | ✅       | ❌        | `amort_french` |
| code  | string | ✅       | ❌        | `FRENCH`       |

### **TransactionType**

| Field | Type   | Required | Sensitive | Example      |
| ----- | ------ | -------- | --------- | ------------ |
| id    | UUID   | ✅       | ❌        | `txn_income` |
| code  | string | ✅       | ❌        | `INCOME`     |

### **CashflowDirection**

| Field | Type   | Required | Sensitive | Example  |
| ----- | ------ | -------- | --------- | -------- |
| id    | UUID   | ✅       | ❌        | `dir_in` |
| code  | string | ✅       | ❌        | `INFLOW` |

### **IncomeType**

| Field | Type   | Required | Sensitive | Example      |
| ----- | ------ | -------- | --------- | ------------ |
| id    | UUID   | ✅       | ❌        | `inc_salary` |
| code  | string | ✅       | ❌        | `SALARY`     |

### **VariabilityType**

| Field | Type   | Required | Sensitive | Example     |
| ----- | ------ | -------- | --------- | ----------- |
| id    | UUID   | ✅       | ❌        | `var_fixed` |
| code  | string | ✅       | ❌        | `FIXED`     |

### **AccountType**

| Field | Type   | Required | Sensitive | Example          |
| ----- | ------ | -------- | --------- | ---------------- |
| id    | UUID   | ✅       | ❌        | `atype_bank`     |
| code  | string | ✅       | ❌        | `BANK`           |
| name  | string | ✅       | ❌        | `"Bank Account"` |

### **CategoryType**

| Field | Type   | Required | Sensitive | Example         |
| ----- | ------ | -------- | --------- | --------------- |
| id    | UUID   | ✅       | ❌        | `ctype_expense` |
| code  | string | ✅       | ❌        | `EXPENSE`       |

### **Risk Level**

| Field | Type   | Required | Sensitive | Example          |
| ----- | ------ | -------- | --------- | ---------------- |
| id    | UUID   | ✅       | ❌        | `risk_level_low` |
| code  | string | ✅       | ❌        | `LOW`            |

### **Currency**

| Field | Type   | Required | Sensitive | Example            |
| ----- | ------ | -------- | --------- | ------------------ |
| id    | UUID   | ✅       | ❌        | `currency_cop`     |
| code  | string | ✅       | ❌        | `COP`              |
| name  | string | ✅       | ❌        | `"Colombian Peso"` |

---

## 🔹 CORE STRUCTURAL MODELS

### **Account**

| Field           | Type    | Required | Sensitive   | Example                         |
| --------------- | ------- | -------- | ----------- | ------------------------------- |
| id              | UUID    | ✅       | ❌          | `acc_bancolombia_savings`       |
| name            | string  | ✅       | ❌          | `"Bancolombia Savings Account"` |
| account_type_id | UUID    | ✅       | ❌          | `atype_bank`                    |
| currency        | string  | ✅       | ❌          | `COP`                           |
| balance         | decimal | ✅       | ✅ (masked) | `3500000`                       |

### **Category** (hierarchical purpose classification)

| Field            | Type   | Required | Sensitive | Example         |
| ---------------- | ------ | -------- | --------- | --------------- |
| id               | UUID   | ✅       | ❌        | `cat_food`      |
| name             | string | ✅       | ❌        | `"Food"`        |
| category_type_id | UUID   | ✅       | ❌        | `ctype_expense` |
| parent_id        | UUID   | ❌       | ❌        | `cat_living`    |

---

## 🔹 FINANCIAL ENGINE MODELS

### **FinancialProduct**

| Field           | Type    | Required | Sensitive | Example                  |
| --------------- | ------- | -------- | --------- | ------------------------ |
| id              | UUID    | ✅       | ❌        | `prod_car_loan`          |
| name            | string  | ✅       | ❌        | `"Mazda Car Loan"`       |
| product_type_id | UUID    | ✅       | ❌        | `ptype_car_loan`         |
| category_id     | UUID    | ✅       | ❌        | `cat_transport`          |
| currency        | string  | ✅       | ❌        | `COP`                    |
| initial_amount  | decimal | ✅       | ✅        | `30000000`               |
| current_balance | decimal | ✅       | ✅        | `18500000`               |
| start_date      | date    | ✅       | ❌        | `2024-01-01`             |
| end_date        | date    | ❌       | ❌        | `2029-01-01`             |
| status_id       | UUID    | ✅       | ❌        | `status_active`          |
| description     | text    | ❌       | ❌        | `"Mazda CX-5 financing"` |

### **ProductTerms**

| Field                    | Type    | Required | Sensitive | Example         |
| ------------------------ | ------- | -------- | --------- | --------------- |
| id                       | UUID    | ✅       | ❌        | `term_001`      |
| product_id               | UUID    | ✅       | ❌        | `prod_car_loan` |
| interest_rate            | decimal | ✅       | ✅        | `0.135`         |
| rate_type_id             | UUID    | ✅       | ❌        | `rate_fixed`    |
| compounding_frequency_id | UUID    | ✅       | ❌        | `comp_monthly`  |
| payment_amount           | decimal | ✅       | ✅        | `1200000`       |
| payment_frequency_id     | UUID    | ✅       | ❌        | `freq_monthly`  |
| total_periods            | integer | ✅       | ❌        | `60`            |
| amortization_type_id     | UUID    | ✅       | ❌        | `amort_french`  |
| grace_periods            | integer | ❌       | ❌        | `3`             |

### **Transaction**

| Field               | Type     | Required | Sensitive | Example                   |
| ------------------- | -------- | -------- | --------- | ------------------------- |
| id                  | UUID     | ✅       | ❌        | `txn_car_payment_may`     |
| product_id          | UUID     | ❌       | ❌        | `prod_car_loan`           |
| account_id          | UUID     | ✅       | ❌        | `acc_bancolombia_savings` |
| transaction_type_id | UUID     | ✅       | ❌        | `txn_payment`             |
| amount              | decimal  | ✅       | ✅        | `1200000`                 |
| date                | datetime | ✅       | ❌        | `2025-05-01`              |
| category_id         | UUID     | ✅       | ❌        | `cat_transport`           |
| description         | text     | ❌       | ❌        | `"Car payment May"`       |

### **TransactionSource**

(tracks which income product funds a payment)
| Field | Type | Required | Sensitive | Example |
|--------------------|---------|----------|-----------|------------------|
| id | UUID | ✅ | ❌ | `tsrc_001` |
| transaction_id | UUID | ✅ | ❌ | `txn_car_payment_may`|
| source_product_id | UUID | ✅ | ❌ | `prod_salary` |
| percentage | decimal | ✅ | ❌ | `1.0` |

### **Cashflow**

| Field               | Type    | Required | Sensitive | Example               |
| ------------------- | ------- | -------- | --------- | --------------------- |
| id                  | UUID    | ✅       | ❌        | `cf_001`              |
| transaction_id      | UUID    | ✅       | ❌        | `txn_car_payment_may` |
| direction_id        | UUID    | ✅       | ❌        | `dir_out`             |
| recurring           | boolean | ✅       | ❌        | `true`                |
| frequency_id        | UUID    | ✅       | ❌        | `freq_monthly`        |
| variability_type_id | UUID    | ✅       | ❌        | `var_fixed`           |

---

## 🔹 SPECIALIZED EXTENSION MODELS

### **IncomeDetails**

| Field               | Type    | Required | Sensitive | Example        |
| ------------------- | ------- | -------- | --------- | -------------- |
| product_id          | UUID    | ✅       | ❌        | `prod_salary`  |
| income_type_id      | UUID    | ✅       | ❌        | `inc_salary`   |
| expected_amount     | decimal | ✅       | ✅        | `8000000`      |
| variability_type_id | UUID    | ✅       | ❌        | `var_fixed`    |
| frequency_id        | UUID    | ✅       | ❌        | `freq_monthly` |

### **SubscriptionDetails**

| Field                | Type    | Required | Sensitive | Example        |
| -------------------- | ------- | -------- | --------- | -------------- |
| product_id           | UUID    | ✅       | ❌        | `prod_netflix` |
| provider             | string  | ✅       | ❌        | `"Netflix"`    |
| plan_name            | string  | ✅       | ❌        | `"Standard"`   |
| billing_frequency_id | UUID    | ✅       | ❌        | `freq_monthly` |
| next_billing_date    | date    | ✅       | ❌        | `2025-06-05`   |
| auto_renew           | boolean | ✅       | ❌        | `true`         |

### **InvestmentDetails**

| Field                | Type    | Required | Sensitive | Example    |
| -------------------- | ------- | -------- | --------- | ---------- |
| product_id           | UUID    | ✅       | ❌        | `prod_cdt` |
| expected_return_rate | decimal | ✅       | ✅        | `0.11`     |
| risk_level           | string  | ✅       | ❌        | `LOW`      |
| liquidity            | string  | ✅       | ❌        | `HIGH`     |

### **ProductSnapshot** (optional time-series balance tracking)

| Field            | Type    | Required | Sensitive | Example         |
| ---------------- | ------- | -------- | --------- | --------------- |
| id               | UUID    | ✅       | ❌        | `snap_001`      |
| product_id       | UUID    | ✅       | ❌        | `prod_car_loan` |
| date             | date    | ✅       | ❌        | `2025-05-01`    |
| balance          | decimal | ✅       | ✅        | `18000000`      |
| accrued_interest | decimal | ❌       | ✅        | `250000`        |

---

Now the categories for the sidebar:

**Reference Data** _(sidebar icon: `Settings`)_  
Configuration tables that define codes, types, and hierarchical categories.

| Model                | Order | Icon             |
| -------------------- | ----- | ---------------- |
| ProductType          | 1     | `Tag`            |
| AccountType          | 2     | `Landmark`       |
| CategoryType         | 3     | `FolderOpen`     |
| Category             | 4     | `FolderTree`     |
| Frequency            | 5     | `Clock`          |
| Status               | 6     | `CheckCircle`    |
| RateType             | 7     | `Percent`        |
| CompoundingFrequency | 8     | `RefreshCw`      |
| AmortizationType     | 9     | `Calculator`     |
| TransactionType      | 10    | `ArrowLeftRight` |
| CashflowDirection    | 11    | `TrendingUp`     |
| IncomeType           | 12    | `DollarSign`     |
| VariabilityType      | 13    | `Sliders`        |
| Risk Level           | 14    | `Shield`         |
| Currency             | 15    | `CurrencyDollar` |

---

**Portfolio** _(sidebar icon: `Wallet`)_  
Core financial entities: accounts, products, and their terms.

| Model            | Order | Icon        |
| ---------------- | ----- | ----------- |
| Account          | 1     | `Building2` |
| FinancialProduct | 2     | `Briefcase` |
| ProductTerms     | 3     | `FileText`  |
| ProductSnapshot  | 4     | `Camera`    |

---

**Transactions** _(sidebar icon: `ArrowLeftRight`)_  
Everything related to money movement and its tracing.

| Model             | Order | Icon       |
| ----------------- | ----- | ---------- |
| Transaction       | 1     | `Receipt`  |
| TransactionSource | 2     | `Link`     |
| Cashflow          | 3     | `Activity` |

---

**Extensions** _(sidebar icon: `Puzzle`)_  
Optional specializations for income, subscriptions, and investments.

| Model               | Order | Icon          |
| ------------------- | ----- | ------------- |
| IncomeDetails       | 1     | `HandCoins`   |
| SubscriptionDetails | 2     | `MonitorPlay` |
| InvestmentDetails   | 3     | `LineChart`   |
