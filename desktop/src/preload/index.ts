
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface RouteLocation {
  name: string
  x: number
  y: number
}

interface RouteOptimizationRequest {
  warehouse: RouteLocation
  locations: RouteLocation[]
}

interface RouteOptimizationResult {
  distance: number
  duration: number
  route: string[]
  geometry: [number, number][]
}

const api = {
  optimizeRoute: (
    request: RouteOptimizationRequest
  ): Promise<RouteOptimizationResult> =>
    ipcRenderer.invoke(
      'route:optimize',
      request
    ) as Promise<RouteOptimizationResult>,

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
