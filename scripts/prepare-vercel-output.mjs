import { cp, mkdir, rm } from 'node:fs/promises';

await rm('v', { recursive: true, force: true });
await mkdir('v/shared-world', { recursive: true });
await cp('dist', 'v/shared-world', { recursive: true });
await cp('pose-public/models', 'v/models', { recursive: true });
await cp('pose-public/mediapipe-wasm', 'v/mediapipe-wasm', { recursive: true });
