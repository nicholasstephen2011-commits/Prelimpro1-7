# Shared package

This folder contains platform-agnostic components and utilities used by both
`PrelimPro-web` and `PrelimPro-mobile`.

- Use `@shared/*` imports from both projects (tsconfig/webpack aliases map them).
- Provide platform-specific files using `.native.tsx` and `.web.tsx` where needed.

Example:

```ts
import { Button } from '@shared';
```
