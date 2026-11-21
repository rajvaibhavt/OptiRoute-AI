
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface RouteLocation {
  name: string
  x: number
  y: number
}


const api = {
  optimizeRoute: (locations: RouteLocation[]) =>
    ipcRenderer.invoke('route:optimize', locations),

  geocodeAddress: (query: string) =>
    ipcRenderer.invoke('geocode:address', query)
}


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI

  // @ts-ignore
  window.api = api
}
