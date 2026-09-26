/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly PROD: boolean
}

declare const __APP_VERSION__: string

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
