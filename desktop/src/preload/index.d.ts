
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
  route: string[]
  geometry: [number, number][]
}

interface OptiRouteAPI {
  optimizeRoute(
    request: RouteOptimizationRequest
  ): Promise<RouteOptimizationResult>

  geocodeAddress(query: string): Promise<GeocodeResult[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OptiRouteAPI
  }
}

export {}
