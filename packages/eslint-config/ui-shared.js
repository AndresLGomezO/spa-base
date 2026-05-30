/** @type {readonly string[]} */
export const WEB_APP_FILES = ["**/*.{tsx,jsx}"];

/** @type {readonly string[]} */
export const WEB_APP_IGNORES = [
  "**/*.test.{tsx,jsx}",
  "**/*.stories.{tsx,jsx}",
];

export const UI_IMPORT =
  'import { Button, Heading, Modal, Sheet, Text, toast, Toaster } from "@repo/ui"';

export const OVERLAY_IMPORT =
  'import { Modal, PhotoUpload, Sheet } from "@repo/ui"';

export const TOAST_IMPORT = 'import { toast, Toaster } from "@repo/ui"';
