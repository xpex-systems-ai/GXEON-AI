# Metro compatibility patch — GX-01.7

`metro@0.83.3.patch` adapts `getAssetData` to the byte-only input supported by the scoped `image-size` 2.0.3 security update. Metro's separate `getAssetSize` already passes bytes, but ordinary file assets previously used the removed synchronous path API. That difference caused HTTP 500 during the full iOS bundle despite the initial Buffer fixture passing.

The patch reads the selected image into a Buffer, preserves non-image handling and changes no package manifest or network behavior. It is registered for exactly Metro 0.83.3 in `patchedDependencies`; an unapplied patch must fail installation. `security-compatibility.mjs` exercises both actual Metro paths, including Expo Router's real `unmatched.png`. The full monorepo build remains a required separate check.

This is build tooling, outside the dedicated Audit OS output. Assets must remain trusted build inputs; loading bytes consumes memory. Review this patch on any Metro/Expo/image-size update, rerun asset fixtures and full iOS/Android builds, and remove it only when the upstream caller supports the selected image-size API. Do not ignore patch failures or replace the regression with a test of image-size alone.

Primary references: [image-size v2 changes](https://github.com/image-size/image-size/releases/tag/v2.0.0), [pnpm 10 patch contract](https://pnpm.io/10.x/cli/patch). The Expo preset is declared directly because the application's Babel configuration references it; no Expo SDK upgrade was performed.
