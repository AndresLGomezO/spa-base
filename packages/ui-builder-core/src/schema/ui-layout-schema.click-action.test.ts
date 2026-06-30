import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema clickAction", () => {
  it("accepts entity record click action on current record", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      clickAction: {
        type: "entityRecord",
        target: "current",
      },
      component: {
        kind: "text",
        primary: { type: "field", path: "name" },
      },
    }) as ComponentRowNode;

    expect(parsed.clickAction).toEqual({
      type: "entityRecord",
      target: "current",
    });
  });

  it("accepts related entity and external URL click actions", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-2",
      clickAction: {
        type: "entityRecord",
        target: { relationFieldPath: "contactId" },
      },
      component: {
        kind: "image",
        primary: { type: "field", path: "photo" },
      },
    }) as ComponentRowNode;

    expect(parsed.clickAction).toEqual({
      type: "entityRecord",
      target: { relationFieldPath: "contactId" },
    });

    const external = componentRowSchema.parse({
      type: "component",
      id: "row-3",
      clickAction: {
        type: "externalUrl",
        url: { type: "static", value: "https://example.com" },
        openInNewTab: true,
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Visit" },
      },
    }) as ComponentRowNode;

    expect(external.clickAction).toEqual({
      type: "externalUrl",
      url: { type: "static", value: "https://example.com" },
      openInNewTab: true,
    });
  });

  it("accepts entityView and entityCreateForm click actions", () => {
    const entityList = componentRowSchema.parse({
      type: "component",
      id: "row-4",
      clickAction: {
        type: "entityView",
        view: "entityList",
        target: { scope: "entity", entityName: "contact" },
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "See all" },
      },
    }) as ComponentRowNode;

    expect(entityList.clickAction).toEqual({
      type: "entityView",
      view: "entityList",
      target: { scope: "entity", entityName: "contact" },
    });

    const createForm = componentRowSchema.parse({
      type: "component",
      id: "row-5",
      clickAction: {
        type: "entityCreateForm",
        target: {
          scope: "relation",
          relationFieldPath: "orders",
        },
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Add order" },
      },
    }) as ComponentRowNode;

    expect(createForm.clickAction).toEqual({
      type: "entityCreateForm",
      target: {
        scope: "relation",
        relationFieldPath: "orders",
      },
    });
  });

  it("accepts entityCreateForm with prefill mappings", () => {
    const createForm = componentRowSchema.parse({
      type: "component",
      id: "row-6",
      clickAction: {
        type: "entityCreateForm",
        target: { scope: "entity", entityName: "transaction" },
        prefill: [
          {
            targetField: "accountId",
            source: { type: "field", path: "id" },
          },
          {
            targetField: "postedAt",
            source: { type: "currentDate" },
          },
          {
            targetField: "status",
            source: { type: "enumValue", value: "draft" },
          },
        ],
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Add transaction" },
      },
    }) as ComponentRowNode;

    expect(createForm.clickAction).toEqual({
      type: "entityCreateForm",
      target: { scope: "entity", entityName: "transaction" },
      prefill: [
        {
          targetField: "accountId",
          source: { type: "field", path: "id" },
        },
        {
          targetField: "postedAt",
          source: { type: "currentDate" },
        },
        {
          targetField: "status",
          source: { type: "enumValue", value: "draft" },
        },
      ],
    });
  });

  it("accepts entityCreateForm prefill mappings with fallback sources", () => {
    const createForm = componentRowSchema.parse({
      type: "component",
      id: "row-8",
      clickAction: {
        type: "entityCreateForm",
        target: { scope: "entity", entityName: "transaction" },
        prefill: [
          {
            targetField: "accountId",
            source: { type: "field", path: "contactId" },
            fallback: { type: "field", path: "id" },
          },
        ],
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Add transaction" },
      },
    }) as ComponentRowNode;

    expect(createForm.clickAction).toEqual({
      type: "entityCreateForm",
      target: { scope: "entity", entityName: "transaction" },
      prefill: [
        {
          targetField: "accountId",
          source: { type: "field", path: "contactId" },
          fallback: { type: "field", path: "id" },
        },
      ],
    });
  });

  it("accepts optional formDesignId on form modal click actions", () => {
    const createForm = componentRowSchema.parse({
      type: "component",
      id: "row-7",
      clickAction: {
        type: "entityCreateForm",
        target: { scope: "entity", entityName: "transaction" },
        formDesignId: "register-payment",
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Register payment" },
      },
    }) as ComponentRowNode;

    expect(createForm.clickAction).toEqual({
      type: "entityCreateForm",
      target: { scope: "entity", entityName: "transaction" },
      formDesignId: "register-payment",
    });

    const editForm = componentRowSchema.parse({
      type: "component",
      id: "row-8",
      clickAction: {
        type: "entityView",
        view: "recordEditForm",
        target: { scope: "current" },
        formDesignId: "quick-edit",
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Quick edit" },
      },
    }) as ComponentRowNode;

    expect(editForm.clickAction).toEqual({
      type: "entityView",
      view: "recordEditForm",
      target: { scope: "current" },
      formDesignId: "quick-edit",
    });
  });
});
