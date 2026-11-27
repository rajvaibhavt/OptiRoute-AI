
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
  originalDistance: number
  route: string[]
  geometry: [number, number][]
}

interface SavedRouteLocation {
  id: number
  name: string
  address: string
  city: string
  x: number
  y: number
  lat: number
  lng: number
}

interface SavedRoute {
  id: string
  name: string
  savedAt: string
  warehouse: SavedRouteLocation
  locations: SavedRouteLocation[]
  optimizedRoute: string[]
  optimizedDistance: number | null
  optimizedDuration: number | null
  originalDistance: number | null
  optimizedGeometry: [number, number][]
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
    ipcRenderer.invoke('geocode:address', query),
   
  getSavedRoutes: (): Promise<SavedRoute[]> =>
    ipcRenderer.invoke('saved-routes:list') as Promise<SavedRoute[]>,

  saveRoute: (route: SavedRoute): Promise<SavedRoute[]> =>
    ipcRenderer.invoke('saved-routes:save', route) as Promise<SavedRoute[]>,

  deleteSavedRoute: (id: string): Promise<SavedRoute[]> =>
    ipcRenderer.invoke('saved-routes:delete', id) as Promise<SavedRoute[]>

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
