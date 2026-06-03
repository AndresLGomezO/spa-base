import type { Meta, StoryObj } from "@storybook/react";

import {
  CardActionsMenu,
  CardFieldCurrency,
  CardFieldDate,
  CardFieldImage,
  CardFieldValue,
  LayoutCard,
  LayoutGrid,
  LayoutStack,
} from "./index";

const mockRecord = {
  name: "Emergency Fund",
  accountTypeId: "Savings • Emergency",
  currencyId: "USD",
  balance: 5250.75,
  createdAt: "2024-01-01T12:00:00.000Z",
  updatedAt: "2024-06-01T12:00:00.000Z",
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
      <LayoutGrid columns={3} gap={12}>
        <LayoutStack align="center" justify="center">
          <CardFieldImage src={mockRecord.bankLogo} alt="Bank logo" />
        </LayoutStack>
        <LayoutStack gap={4}>
          <CardFieldValue value={mockRecord.name} textSize={16} />
          <CardFieldValue value={mockRecord.accountTypeId} textColor="muted" />
          <CardFieldValue
            value={mockRecord.currencyId}
            label="Currency"
            showLabel
          />
          <CardFieldValue
            value={mockRecord.balance}
            label="Balance"
            showLabel
          />
        </LayoutStack>
        <LayoutStack align="end" gap={4}>
          <CardFieldCurrency amount={mockRecord.balance} currency="USD" />
          <CardFieldDate
            value={mockRecord.createdAt}
            label="Created"
            showLabel
            locale="en"
          />
          <CardFieldDate
            value={mockRecord.updatedAt}
            label="Updated"
            showLabel
            locale="en"
          />
        </LayoutStack>
      </LayoutGrid>
    </LayoutCard>
  ),
};
