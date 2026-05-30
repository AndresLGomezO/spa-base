/**
 * UI primitive enforcement for apps/web.
 *
 * Overlay rules: use Modal (centered dialogs) or Sheet (slide-overs) from @repo/ui.
 * Do not use createPortal, aria-modal on raw JSX, or third-party dialog libraries in app code.
 */
const UI_IMPORT =
  'import { Button, Heading, Modal, Sheet, Text } from "@repo/ui"';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["**/*.{tsx,jsx}"],
    ignores: ["**/*.test.{tsx,jsx}", "**/*.stories.{tsx,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-dom",
              importNames: ["createPortal"],
              message: `Use Modal or Sheet from @repo/ui instead of createPortal. ${UI_IMPORT}`,
            },
            {
              name: "@radix-ui/react-dialog",
              message: `Use Modal or Sheet from @repo/ui instead of Radix Dialog. ${UI_IMPORT}`,
            },
            {
              name: "@headlessui/react",
              message: `Use Modal or Sheet from @repo/ui instead of Headless UI overlays. ${UI_IMPORT}`,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: `Use Button or IconButton from @repo/ui instead of <button>. ${UI_IMPORT}`,
        },
        {
          selector: "JSXOpeningElement[name.name=/^h[1-3]$/]",
          message: `Use Heading from @repo/ui instead of heading elements. ${UI_IMPORT}`,
        },
        {
          selector: "JSXOpeningElement[name.name='p']",
          message: `Use Text from @repo/ui instead of <p>. ${UI_IMPORT}`,
        },
        {
          selector: "JSXOpeningElement[name.name='form']",
          message: `Use a form primitive from @repo/ui instead of <form> (add to @repo/ui when needed).`,
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: `Use an input primitive from @repo/ui instead of <input> (add to @repo/ui when needed).`,
        },
        {
          selector: "JSXAttribute[name.name='aria-modal']",
          message: `Use Modal or Sheet from @repo/ui for overlays instead of aria-modal on raw JSX. ${UI_IMPORT}`,
        },
      ],
    },
  },
];
