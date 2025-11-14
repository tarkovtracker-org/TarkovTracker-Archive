/// <reference types="vite/client" />
// Help resolve Vite's internal type modules
declare module '#types/hot' {
  import type { HotModule } from 'vite';
  export const hot: HotModule;
}
declare module '#types/hmrPayload' {
  import type { HMRPayload } from 'vite';
  export const hmrPayload: HMRPayload;
}
declare module '#types/customEvent' {
  import type { CustomEvent } from 'vite';
  export const customEvent: CustomEvent;
}
