
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

interface OptiRouteAPI {
  optimizeRoute(
    locations: RouteLocation[]
  ): Promise<{
    distance: number
    route: string[]
  }>

  geocodeAddress(query: string): Promise<GeocodeResult[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OptiRouteAPI
  }
}

export {}
