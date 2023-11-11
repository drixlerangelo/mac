/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENAI_KEY: string
    readonly VITE_ELEVENLABS_KEY: string
    readonly VITE_OPENAI_URL: string
    readonly VITE_ELEVENLABS_URL: string
    readonly VITE_ELEVENLABS_VOICE_ID: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
