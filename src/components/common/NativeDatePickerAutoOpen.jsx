import { useEffect } from "react";

/**
 * Site-wide behaviour for native date/time inputs:
 * a single click anywhere on the field opens the browser's calendar/time
 * popup, instead of only the small indicator icon.
 *
 * Mount once (in App). Uses one delegated listener so it also covers
 * inputs rendered later or by third-party components.
 */
const PICKER_INPUT_TYPES = new Set([
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
]);

const isPickerInput = (el) =>
  el instanceof HTMLInputElement &&
  PICKER_INPUT_TYPES.has(el.type) &&
  !el.disabled &&
  !el.readOnly;

const openPicker = (input) => {
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    /* showPicker() throws without user activation or when already open; ignore */
  }
};

const NativeDatePickerAutoOpen = () => {
  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target;
      if (!isPickerInput(target)) return;
      openPicker(target);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
};

export default NativeDatePickerAutoOpen;
