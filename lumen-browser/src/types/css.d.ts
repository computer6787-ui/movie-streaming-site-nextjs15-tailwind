/**
 * Ambient declarations for plain (non-module) stylesheet imports.
 *
 * Next ships types for CSS *modules* (`*.module.css`) but not for plain
 * `*.css`. A side-effect import like `import "./globals.css"` in the root
 * layout is valid at runtime, yet the editor reports TS2882 when side-effect
 * imports are checked. Declaring the pattern here keeps that import typed as
 * side-effect-only, which is all it is used for.
 */

declare module "*.css" {
  const content: string;
  export default content;
}
