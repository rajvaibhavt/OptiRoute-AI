
import { useEffect } from 'react'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet'

import type { LatLngBoundsExpression } from 'leaflet'

import 'leaflet/dist/leaflet.css'

// --------------------------------------------------
// Types
// --------------------------------------------------

export type MapLocation = {
  id: number
  name: string
  lat: number
  lng: number
}

export type WarehouseMapPoint = {
  lat: number
  lng: number
}

type DeliveryMapProps = {
  warehouse: MapLocation | null
  locations: MapLocation[]
  routeNames: string[]
  geometry?: [number, number][] | null

  // Enable clicking on the map to choose a warehouse.
  selectingWarehouse?: boolean

  // Coordinates selected by the user, awaiting confirmation.
  selectedWarehousePoint?: WarehouseMapPoint | null

  // Sends clicked coordinates to App.tsx.
  onWarehouseMapClick?: (point: WarehouseMapPoint) => void
}

// --------------------------------------------------
// Map view updater
// --------------------------------------------------

type MapViewUpdaterProps = {
  positions: [number, number][]
  fallbackCenter: [number, number]
  fallbackZoom: number
  enabled: boolean
}

function MapViewUpdater({
  positions,
  fallbackCenter,
  fallbackZoom,
  enabled
}: MapViewUpdaterProps) {
  const map = useMap()

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (positions.length > 1) {
      const bounds: LatLngBoundsExpression = positions

      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15
      })
    } else {
      map.setView(fallbackCenter, fallbackZoom)
    }
  }, [
    map,
    positions,
    fallbackCenter,
    fallbackZoom,
    enabled
  ])

  return null
}

// --------------------------------------------------
// Warehouse map click handler
// --------------------------------------------------

type WarehouseMapClickHandlerProps = {
  enabled: boolean
  onWarehouseMapClick?: (point: WarehouseMapPoint) => void
}

function WarehouseMapClickHandler({
  enabled,
  onWarehouseMapClick
}: WarehouseMapClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (!enabled || !onWarehouseMapClick) {
        return
      }

      onWarehouseMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng
      })
    }
  })

  return null
}

// --------------------------------------------------
// Delivery map
// --------------------------------------------------

function DeliveryMap({
  warehouse,
  locations,
  routeNames,
  geometry,
  selectingWarehouse = false,
  selectedWarehousePoint = null,
  onWarehouseMapClick
}: DeliveryMapProps) {
  // This is only the initial map viewing position.
  // It is NOT automatically saved as the warehouse.
  const initialMapCenter: [number, number] = [
    26.207543,
    81.6908608
  ]

  const defaultCenter: [number, number] = [
    20.5937,
    78.9629
  ]

  const mapCenter: [number, number] = warehouse
    ? [warehouse.lat, warehouse.lng]
    : initialMapCenter || defaultCenter

  // ------------------------------------------------
  // Fallback route
  // Used only when road geometry is unavailable.
  // ------------------------------------------------

  const routePositions: [number, number][] = routeNames
    .map((name) => {
      if (name === 'Warehouse') {
        return warehouse
          ? ([warehouse.lat, warehouse.lng] as [number, number])
          : null
      }

      const location = locations.find(
        (item) => item.name === name
      )

      return location
        ? ([location.lat, location.lng] as [number, number])
        : null
    })
    .filter(
      (position): position is [number, number] =>
        position !== null
    )

  // ------------------------------------------------
  // Actual road geometry from OSRM
  // Coordinates are [latitude, longitude].
  // ------------------------------------------------

  const roadPositions =
    geometry && geometry.length > 0
      ? geometry
      : routePositions

  // ------------------------------------------------
  // Map bounds
  // ------------------------------------------------

  const allMapPositions: [number, number][] = [
    ...(warehouse
      ? [[warehouse.lat, warehouse.lng] as [number, number]]
      : []),

    ...locations.map(
      (location) =>
        [location.lat, location.lng] as [number, number]
    ),

    ...roadPositions
  ]

  return (
    <div className="delivery-map-container">
      <MapContainer
        center={mapCenter}
        zoom={warehouse ? 12 : 15}
        scrollWheelZoom={true}
        className="delivery-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater
          positions={allMapPositions}
          fallbackCenter={mapCenter}
          fallbackZoom={warehouse ? 12 : 15}
          enabled={!selectingWarehouse}
        />

        <WarehouseMapClickHandler
          enabled={selectingWarehouse}
          onWarehouseMapClick={onWarehouseMapClick}
        />

        {/* Current warehouse marker */}

        {warehouse && (
          <Marker position={[warehouse.lat, warehouse.lng]}>
            <Popup>
              <strong>Current Warehouse</strong>
              <br />
              {warehouse.name}
              <br />
              {warehouse.lat.toFixed(6)}, {warehouse.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Temporary selected warehouse point */}

        {selectingWarehouse && selectedWarehousePoint && (
          <Marker
            position={[
              selectedWarehousePoint.lat,
              selectedWarehousePoint.lng
            ]}
          >
            <Popup>
              <strong>Selected Warehouse Point</strong>
              <br />
              {selectedWarehousePoint.lat.toFixed(6)},
              {' '}
              {selectedWarehousePoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Delivery markers */}

        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
          >
            <Popup>
              <strong>{location.name}</strong>
              <br />
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </Popup>
          </Marker>
        ))}

        {/* Optimized road route */}

        {!selectingWarehouse && roadPositions.length > 1 && (
          <Polyline
            positions={roadPositions}
            pathOptions={{
              color: '#2563eb',
              weight: 5,
              opacity: 0.85
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

export default DeliveryMap
