
import type { ElectronAPI } from '@electron-toolkit/preload'

interface RouteLocation {
  name: string
  x: number
  y: number
}

interface GeocodeResult {
  placeId: number
  displayName: string
  city: string
  lat: number
  lng: number
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

interface OptiRouteAPI {
  optimizeRoute(
    request: RouteOptimizationRequest
  ): Promise<RouteOptimizationResult>

  geocodeAddress(query: string): Promise<GeocodeResult[]>

  getSavedRoutes(): Promise<SavedRoute[]>

  saveRoute(route: SavedRoute): Promise<SavedRoute[]>

  deleteSavedRoute(id: string): Promise<SavedRoute[]>

}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OptiRouteAPI
  }
}

export {}
