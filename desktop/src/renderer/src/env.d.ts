
/// <reference types="vite/client" />

interface Window {
  electron: {
    process: {
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}
