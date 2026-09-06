# Motion mini (vendored)

This is the unminified, tree-shaken ESM build of `motion/mini` from Motion **12.43.0** (MIT).
Only the DOM animation entry is included. The original MIT license is in LICENSE.md.
It is dynamically loaded by `useGentleMotion`; the UI stays visible if the import or animation is unavailable.

The source was installed with `npm install --save-exact --ignore-scripts motion@12` in an isolated GitHub Actions workspace, resolved to 12.43.0, then bundled with the already locked esbuild dependency. No external CDN or analytics is used at runtime.

Regenerate in a temporary copy of the repository (never against household data):

```sh
npm ci
npm install --no-save --package-lock=false --ignore-scripts motion@12.43.0
node scripts/vendor-motion.mjs
npm ci
```

Review the generated diff and re-run `npm run lint`, `npm test`, browser tests and PWA tests before updating.
Official documentation: https://motion.dev/docs/animate and https://motion.dev/docs/react-reduce-bundle-size
