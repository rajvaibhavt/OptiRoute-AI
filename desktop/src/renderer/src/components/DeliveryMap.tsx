
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

export type MapLocation = {
  id: number
  name: string
  lat: number
  lng: number
}

type DeliveryMapProps = {
  warehouse: MapLocation | null
  locations: MapLocation[]
  routeNames: string[]
}

function DeliveryMap({
  warehouse,
  locations,
  routeNames
}: DeliveryMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]

  const mapCenter: [number, number] = warehouse
    ? [warehouse.lat, warehouse.lng]
    : defaultCenter

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

  return (
    <div className="delivery-map-container">
      <MapContainer
        center={mapCenter}
        zoom={warehouse ? 12 : 5}
        scrollWheelZoom={true}
        className="delivery-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {warehouse && (
          <Marker position={[warehouse.lat, warehouse.lng]}>
            <Popup>
              <strong>Warehouse</strong>
              <br />
              {warehouse.name}
            </Popup>
          </Marker>
        )}

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

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#2563eb',
              weight: 4
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

export default DeliveryMap
