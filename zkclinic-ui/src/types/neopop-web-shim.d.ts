/**
 * Shim for @cred/neopop-web: package typings do not resolve cleanly with TS + package.json "exports".
 * @see https://github.com/cred-club/neopop-web
 */
declare module "@cred/neopop-web" {
  export namespace Primitives {
    export function extend(config: Record<string, unknown>): void;
    export const mainColors: Record<string, string>;
    export const colorPalette: Record<string, unknown>;
  }
}
