/// <reference types="vite/client" />

// Electron Forge Vite plugin injects these at runtime
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// React 19 has built-in types - declare module types for proper resolution
declare module 'react-dom/client' {
  import { ReactNode } from 'react';
  
  interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  
  interface RootOptions {
    onRecoverableError?: (error: unknown) => void;
    identifierPrefix?: string;
  }
  
  export function createRoot(
    container: Element | DocumentFragment,
    options?: RootOptions
  ): Root;
  
  export function hydrateRoot(
    container: Element | DocumentFragment,
    children: ReactNode,
    options?: RootOptions
  ): Root;
}

// CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}
