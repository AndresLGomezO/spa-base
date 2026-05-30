/**
 * Overlay enforcement for apps/web.
 * Use Modal, Sheet, or PhotoUpload from @repo/ui — never custom dialogs or third-party overlay libs.
 */
import { OVERLAY_IMPORT, WEB_APP_FILES, WEB_APP_IGNORES } from "./ui-shared.js";

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
              name: "react-dom",
              importNames: ["createPortal"],
              message: `Use Modal or Sheet from @repo/ui instead of createPortal. ${OVERLAY_IMPORT}`,
            },
            {
              name: "@radix-ui/react-dialog",
              message: `Use Modal or Sheet from @repo/ui instead of Radix Dialog. ${OVERLAY_IMPORT}`,
            },
            {
              name: "@radix-ui/react-alert-dialog",
              message: `Use Modal from @repo/ui instead of Radix Alert Dialog. ${OVERLAY_IMPORT}`,
            },
            {
              name: "@headlessui/react",
              message: `Use Modal or Sheet from @repo/ui instead of Headless UI overlays. ${OVERLAY_IMPORT}`,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='aria-modal']",
          message: `Use Modal or Sheet from @repo/ui for overlays instead of aria-modal on raw JSX. ${OVERLAY_IMPORT}`,
        },
        {
          selector: "JSXOpeningElement[name.name='dialog']",
          message: `Use Modal or Sheet from @repo/ui instead of the native <dialog> element. ${OVERLAY_IMPORT}`,
        },
      ],
    },
  },
];
