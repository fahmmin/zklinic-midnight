/**
 * NeoPOP design tokens — white + olive green (CRED-style elevated UI).
 * @see https://github.com/cred-club/neopop-web
 */
import * as Neopop from "@cred/neopop-web";

let didInit = false;

export function initNeopopTheme(): void {
  if (didInit) return;
  didInit = true;
  const { extend, mainColors, colorPalette } = Neopop.Primitives;
  extend({
    mainColors: {
      ...mainColors,
      black: "#141414",
      white: "#fafafa",
      yellow: "#6b7c3a"
    },
    colorPalette: {
      ...colorPalette
    }
  });
}
