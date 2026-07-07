import { fireEvent, screen } from "@testing-library/react";

/** Opens a searchable AdminSelect by accessible name and picks an option. */
export function selectAdminSelectOption(
  accessibleName: string | RegExp,
  optionLabel: string | RegExp,
) {
  fireEvent.click(screen.getByLabelText(accessibleName));
  fireEvent.click(screen.getByRole("button", { name: optionLabel }));
}

/** Returns the JSON import textarea from the open import dialog. */
export function getJsonImportTextarea(): HTMLTextAreaElement {
  const textarea = document.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error("JSON import textarea not found");
  }

  return textarea;
}
