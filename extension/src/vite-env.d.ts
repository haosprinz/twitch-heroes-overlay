/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EBS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
