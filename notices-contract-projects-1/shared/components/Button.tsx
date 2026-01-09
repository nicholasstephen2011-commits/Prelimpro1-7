/* Platform-agnostic entry that resolves to web/native implementations at runtime.
   Consumers should import from '@shared/components/Button' or from '@shared' via index.ts.
*/
import type React from 'react';

// Use a runtime check to select the platform implementation. This keeps the
// bundle behavior predictable for both Next.js (web) and Metro (native).
let Impl: any;

if (typeof window !== 'undefined') {
  // Running in a browser (Next.js client) -> use web implementation
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Impl = require('./Button.web').default;
} else {
  // Likely running in React Native runtime (Metro) or server (choose native for SSR safety)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Impl = require('./Button.native').default;
}

export type ButtonProps = React.ComponentProps<typeof Impl>;
export default Impl;
