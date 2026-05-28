const UI_IMPORT = 'import { Button, Heading, Text } from "@repo/ui"';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["**/*.{tsx,jsx}"],
    ignores: ["**/*.test.{tsx,jsx}", "**/*.stories.{tsx,jsx}"],
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
