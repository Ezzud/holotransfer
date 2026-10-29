/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_TAURI?: string;
  readonly VITE_APP_VERSION?: string;
  readonly LATEST_RELEASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Navigator {
  readonly userAgentData?: {
    readonly platform?: string;
  };
}
