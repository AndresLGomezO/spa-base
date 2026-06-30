import { describe, expect, it } from "vitest";

import { resolveComponentClickTarget } from "./resolve-component-click-target.js";

const definition = {
  name: "order",
  fields: {
    id: { type: "string" },
    contactId: {
      type: "string",
      relation: { type: "many-to-one", target: "contact" },
    },
  },
  ui: { fields: {} },
} as const;

describe("resolveComponentClickTarget", () => {
  it("resolves current record navigation", () => {
    const target = resolveComponentClickTarget({
      action: { type: "entityRecord", target: "current" },
      item: { id: "order-1" },
      entityName: "order",
      definition: definition as never,
      resolveField: () => null,
      returnTo: "/app/order",
    });

    expect(target).toEqual({
      href: "/app/order/order-1",
      external: false,
      state: { returnTo: "/app/order" },
    });
  });

  it("resolves related entity from FK field path", () => {
    const target = resolveComponentClickTarget({
      action: {
        type: "entityRecord",
        target: { relationFieldPath: "contactId" },
      },
      item: { id: "order-1", contactId: "contact-9" },
      entityName: "order",
      definition: definition as never,
      resolveField: () => null,
    });

    expect(target).toEqual({
      href: "/app/contact/contact-9",
      external: false,
    });
  });

  it("resolves related entity from dotted relation field path", () => {
    const target = resolveComponentClickTarget({
      action: {
        type: "entityRecord",
        target: { relationFieldPath: "contact.name" },
      },
      item: { id: "order-1", contactId: "contact-9" },
      entityName: "order",
      definition: definition as never,
      resolveField: () => null,
    });

    expect(target?.href).toBe("/app/contact/contact-9");
  });

  it("resolves static and field external URLs", () => {
    expect(
      resolveComponentClickTarget({
        action: {
          type: "externalUrl",
          url: { type: "static", value: "https://example.com" },
        },
        item: {},
        entityName: "order",
        definition: definition as never,
        resolveField: () => null,
      }),
    ).toEqual({
      href: "https://example.com",
      external: true,
      openInNewTab: true,
    });

    expect(
      resolveComponentClickTarget({
        action: {
          type: "externalUrl",
          url: { type: "field", path: "website" },
          openInNewTab: false,
        },
        item: { website: "https://acme.test" },
        entityName: "order",
        definition: definition as never,
        resolveField: (path) =>
          path === "website" ? "https://acme.test" : null,
      }),
    ).toEqual({
      href: "https://acme.test",
      external: true,
      openInNewTab: false,
    });
  });

  it("rejects invalid external URLs", () => {
    expect(
      resolveComponentClickTarget({
        action: {
          type: "externalUrl",
          url: { type: "static", value: "javascript:alert(1)" },
        },
        item: {},
        entityName: "order",
        definition: definition as never,
        resolveField: () => null,
      }),
    ).toBeNull();
  });

  it("resolves entity list view for explicit entity target", () => {
    const target = resolveComponentClickTarget({
      action: {
        type: "entityView",
        view: "entityList",
        target: { scope: "entity", entityName: "contact" },
      },
      item: { id: "order-1" },
      entityName: "order",
      definition: definition as never,
      resolveField: () => null,
      returnTo: "/app/order",
    });

    expect(target).toEqual({
      href: "/app/contact",
      external: false,
      state: { returnTo: "/app/order" },
    });
  });

  it("resolves record edit form navigation", () => {
    const target = resolveComponentClickTarget({
      action: {
        type: "entityView",
        view: "recordEditForm",
        target: { scope: "current" },
      },
      item: { id: "order-1" },
      entityName: "order",
      definition: definition as never,
      resolveField: () => null,
      returnTo: "/app/order?q=foo",
    });

    expect(target).toEqual({
      href: "/app/order?q=foo&edit=order-1",
      external: false,
    });
  });

  it("resolves create form with relation prefill for one-to-many", () => {
    const accountDefinition = {
      name: "account",
      fields: {
        id: { type: "string" },
        orders: {
          type: "array",
          relation: { type: "one-to-many", target: "order" },
        },
      },
      ui: { fields: {} },
    } as const;

    const orderDefinition = {
      name: "order",
      fields: {
        id: { type: "string" },
        accountId: {
          type: "string",
          relation: { type: "many-to-one", target: "account" },
        },
      },
      ui: { fields: {} },
    } as const;

    const target = resolveComponentClickTarget({
      action: {
        type: "entityCreateForm",
        target: { scope: "relation", relationFieldPath: "orders" },
      },
      item: { id: "account-1" },
      entityName: "account",
      definition: accountDefinition as never,
      getDefinition: (name) =>
        name === "order" ? (orderDefinition as never) : undefined,
      resolveField: () => null,
      returnTo: "/app/account",
    });

    expect(target).toEqual({
      href: "/app/order?create=&accountId=account-1",
      external: false,
    });
  });
});
