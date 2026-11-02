/**
 * The first palette, mapped to the current "toy box" palette. Saved themes
 * that still use an old built-in swatch are moved across on load; colours
 * the user picked themselves are left alone.
 */
const LEGACY: Record<string, string> = {
  "#F04444": "#FF5C6C",
  "#FF7A2F": "#FF9548",
  "#FFD84D": "#FFD447",
  "#8EE3C5": "#7BF1C8",
  "#2FB47C": "#2FCB8A",
  "#3867F5": "#4062FF",
  "#5BC0F8": "#62D2FF",
  "#8756E8": "#A77BFF",
  "#F6A6C7": "#FF9FD0",
  "#C8A27A": "#D9A877",
  "#2B2D42": "#3B2F5E",
  "#E9E1CF": "#EFE4F5",
};

export function refreshColor(hex: string): string {
  return LEGACY[hex.toUpperCase()] ?? hex;
}
