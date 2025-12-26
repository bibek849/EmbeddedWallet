/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_RPC_URL?: string;
  readonly VITE_ETHEREUM_RPC_URL?: string;
  readonly VITE_OPTIMISM_RPC_URL?: string;
  readonly VITE_ARBITRUM_RPC_URL?: string;
  readonly VITE_POLYGON_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


