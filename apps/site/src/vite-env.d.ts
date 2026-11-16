/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sales WhatsApp number in international form (e.g. 2348012345678). Unset hides "Book a demo". */
  readonly VITE_SALES_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
