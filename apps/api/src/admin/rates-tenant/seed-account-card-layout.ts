import type { ViewConfig } from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { RATES_TENANT_ID } from "./constants.js";

const accountTableView: ViewConfig = {
  type: "table",
  name: "default",
  fields: [
    "name",
    "accountTypeId",
    "currencyId",
    "bankId",
    "balance",
    "createdAt",
    "updatedAt",
  ],
};

const accountCardView: ViewConfig = {
  type: "card",
  name: "card",
  fields: [
    "name",
    "accountTypeId",
    "currencyId",
    "bankId",
    "balance",
    "createdAt",
    "updatedAt",
  ],
  layout: {
    showActions: true,
    slots: {
      logo: {
        component: "image",
        fieldPath: "bankId.logo",
        className: "flex items-center justify-center",
      },
      name: {
        component: "text",
        fieldPath: "name",
        className: "text-base font-semibold",
      },
      "account-type": {
        component: "text",
        fieldPath: "accountTypeId",
        showLabel: false,
        className: "text-muted-foreground text-sm",
      },
      currency: {
        component: "text",
        fieldPath: "currencyId",
        showLabel: true,
        label: "Currency",
      },
      "balance-info": {
        component: "text",
        fieldPath: "balance",
        showLabel: true,
        label: "Balance",
      },
      "balance-amount": {
        component: "currency",
        fieldPath: "balance",
        className: "items-end",
      },
      "created-at": {
        component: "text",
        fieldPath: "createdAt",
        showLabel: true,
        label: "Created",
      },
      "updated-at": {
        component: "text",
        fieldPath: "updatedAt",
        showLabel: true,
        label: "Updated",
      },
    },
    root: {
      type: "grid",
      direction: "row",
      gap: 16,
      columns: 4,
      align: "center",
      children: [
        { type: "slot", slotId: "logo", align: "center", flex: 1 },
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          children: [
            { type: "slot", slotId: "name" },
            { type: "slot", slotId: "account-type" },
            { type: "slot", slotId: "currency" },
            { type: "slot", slotId: "balance-info" },
          ],
        },
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          align: "end",
          children: [
            { type: "slot", slotId: "balance-amount" },
            { type: "slot", slotId: "created-at" },
            { type: "slot", slotId: "updated-at" },
          ],
        },
      ],
    },
  },
};

export async function seedRatesAccountCardLayout(
  repository: EntityUiOverrideRepository,
): Promise<void> {
  await repository.put(RATES_TENANT_ID, "account", {
    views: [accountTableView, accountCardView],
    listViewType: "table",
  });
}
