import type { Meta, StoryObj } from "@storybook/react";

import {
  CardActionsMenu,
  CardFieldBadge,
  CardFieldCurrency,
  CardFieldImage,
  CardFieldValue,
  createFourColumnFinancialLayout,
  LayoutCard,
  LayoutRenderer,
} from "./index";

const financialLayout = createFourColumnFinancialLayout({
  logo: {
    component: "image",
    fieldPath: "bankId.logo",
    className: "flex items-center justify-center",
  },
  "info-name": {
    component: "text",
    fieldPath: "name",
    className: "text-base font-semibold",
  },
  "info-type": {
    component: "text",
    fieldPath: "accountTypeId",
    showLabel: false,
    className: "text-muted-foreground text-sm",
  },
  "info-currency": {
    component: "text",
    fieldPath: "currencyId",
    label: "Currency",
    showLabel: true,
  },
  "info-balance": {
    component: "text",
    fieldPath: "balance",
    label: "Initial",
    showLabel: true,
  },
  "balance-amount": {
    component: "currency",
    fieldPath: "balance",
    className: "items-end",
  },
  "balance-label": {
    component: "text",
    fieldPath: "balanceLabel",
    className: "text-muted-foreground text-xs uppercase",
  },
  "balance-dates": {
    component: "text",
    fieldPath: "createdAt",
    label: "Start",
    showLabel: true,
  },
  status: {
    component: "badge",
    fieldPath: "status",
    badgeVariants: {
      active: "active",
      pending: "pending",
      closed: "closed",
    },
  },
});

const mockRecord = {
  name: "Emergency Fund",
  accountTypeId: "Savings • Emergency",
  currencyId: "USD",
  balance: 5250.75,
  balanceLabel: "Current balance",
  createdAt: "Jan 1, 2024",
  status: "Active",
  bankLogo:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Generic_bank_icon.svg/240px-Generic_bank_icon.svg.png",
};

const meta = {
  title: "Components/LayoutCard",
  component: LayoutCard,
  tags: ["autodocs"],
} satisfies Meta<typeof LayoutCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FinancialFourColumn: Story = {
  args: { children: null },
  render: () => (
    <LayoutCard
      interactive
      actions={
        <CardActionsMenu
          actions={[
            { id: "edit", label: "Edit", onSelect: () => undefined },
            {
              id: "share",
              label: "Share",
              onSelect: () => undefined,
              badgeCount: 2,
            },
            {
              id: "delete",
              label: "Remove",
              onSelect: () => undefined,
              destructive: true,
            },
          ]}
        />
      }
    >
      <LayoutRenderer
        layout={financialLayout}
        renderSlot={(_slotId, binding) => {
          if (!binding) return null;

          switch (binding.component) {
            case "image":
              return (
                <CardFieldImage
                  src={mockRecord.bankLogo}
                  alt="Bank logo"
                  className={binding.className}
                />
              );
            case "currency":
              return (
                <CardFieldCurrency
                  amount={`$${mockRecord.balance.toLocaleString()}`}
                  currency={String(mockRecord.currencyId)}
                  tone="positive"
                  className={binding.className}
                />
              );
            case "badge":
              return (
                <CardFieldBadge
                  value={mockRecord.status}
                  variant="active"
                  className={binding.className}
                />
              );
            default:
              return (
                <CardFieldValue
                  label={binding.label}
                  showLabel={binding.showLabel}
                  value={
                    mockRecord[binding.fieldPath as keyof typeof mockRecord] ??
                    "—"
                  }
                  className={binding.className}
                />
              );
          }
        }}
      />
    </LayoutCard>
  ),
};

export const SlotComponents: Story = {
  args: { children: null },
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <CardFieldValue label="Name" showLabel value="Emergency Fund" />
      <CardFieldImage src={mockRecord.bankLogo} />
      <CardFieldCurrency amount="$5,250.75" currency="USD" tone="positive" />
      <CardFieldBadge value="Active" variant="active" />
    </div>
  ),
};
