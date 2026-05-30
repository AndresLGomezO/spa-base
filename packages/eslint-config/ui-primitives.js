/**
 * UI primitive enforcement for apps/web (typography, buttons, form controls).
 * Overlay rules: @repo/eslint-config/ui-overlays
 * Toast rules: @repo/eslint-config/ui-toasts
 */
import { UI_IMPORT, WEB_APP_FILES, WEB_APP_IGNORES } from "./ui-shared.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: WEB_APP_FILES,
    ignores: WEB_APP_IGNORES,
    rules: {
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
      ],
    },
  },
];
