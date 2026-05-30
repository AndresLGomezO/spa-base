/**
 * Toast enforcement for apps/web.
 * Use toast + a single Toaster from @repo/ui — never alert(), sonner, or other toast libraries.
 */
import { TOAST_IMPORT, WEB_APP_FILES, WEB_APP_IGNORES } from "./ui-shared.js";

const TOASTER_ONLY_IN_ROOT_IGNORES = [...WEB_APP_IGNORES, "app/root.tsx"];

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: WEB_APP_FILES,
    ignores: WEB_APP_IGNORES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sonner",
              message: `Import toast from @repo/ui instead of sonner directly. ${TOAST_IMPORT}`,
            },
            {
              name: "react-hot-toast",
              message: `Use toast from @repo/ui instead of react-hot-toast. ${TOAST_IMPORT}`,
            },
            {
              name: "react-toastify",
              message: `Use toast from @repo/ui instead of react-toastify. ${TOAST_IMPORT}`,
            },
            {
              name: "notistack",
              message: `Use toast from @repo/ui instead of notistack. ${TOAST_IMPORT}`,
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "alert",
          message: `Use toast from @repo/ui for transient feedback instead of alert(). ${TOAST_IMPORT}`,
        },
      ],
    },
  },
  {
    files: WEB_APP_FILES,
    ignores: TOASTER_ONLY_IN_ROOT_IGNORES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@repo/ui",
              importNames: ["Toaster"],
              message: `Mount <Toaster /> only in app/root.tsx. ${TOAST_IMPORT}`,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='Toaster']",
          message: `Mount <Toaster /> only in app/root.tsx. ${TOAST_IMPORT}`,
        },
      ],
    },
  },
];
