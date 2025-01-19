/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_JWT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 