import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { ThemeProvider } from "@repo/theme/react";

import "../src/styles/storybook.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    (Story) => (
      <ThemeProvider>
        <div className="bg-background text-foreground min-w-[20rem] p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
