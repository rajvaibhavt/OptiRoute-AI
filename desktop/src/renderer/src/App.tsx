import { useState } from 'react'

import './assets/main.css'

import DeliveryMap, {
  type MapLocation,
  type WarehouseMapPoint
} from './components/DeliveryMap'



type DeliveryLocation = {

  id: number

  name: string

  address: string

  city: string

  x: number

  y: number

  lat: number

  lng: number

}



type GeocodeResult = {

  placeId: number

  displayName: string

  city: string

  lat: number

  lng: number

}


function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—'
  }

  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  if (minutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}


function getWarehouseShortName(name: string): string {
  if (name === 'Map-selected Warehouse') {
    return 'Map-selected'
  }

  const parts = name
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.slice(0, 2).join(', ') || name
}


function App(): React.JSX.Element {

  const [activePage, setActivePage] = useState('Dashboard')



  const [warehouse, setWarehouse] = useState<MapLocation | null>(null)

  const [isSelectingWarehouse, setIsSelectingWarehouse] = useState(false)

  const [selectedWarehousePoint, setSelectedWarehousePoint] =
    useState<WarehouseMapPoint | null>(null)

  const [locations, setLocations] = useState<DeliveryLocation[]>([])



  const [warehouseQuery, setWarehouseQuery] = useState('')

  const [warehouseResults, setWarehouseResults] = useState<GeocodeResult[]>([])

  const [isSearchingWarehouse, setIsSearchingWarehouse] = useState(false)

  const [warehouseSearchError, setWarehouseSearchError] = useState('')



  const [deliveryQuery, setDeliveryQuery] = useState('')

  const [deliveryResults, setDeliveryResults] = useState<GeocodeResult[]>([])

  const [isSearchingDelivery, setIsSearchingDelivery] = useState(false)

  const [deliverySearchError, setDeliverySearchError] = useState('')



  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([])

  const [optimizedDistance, setOptimizedDistance] = useState<number | null>(null)
  const [optimizedDuration, setOptimizedDuration] = useState<number | null>(null)
  const [originalDistance, setOriginalDistance] = useState<number | null>(null)
  const [optimizedGeometry, setOptimizedGeometry] = useState<[number, number][]>([])

  const [isOptimizing, setIsOptimizing] = useState(false)

  const [optimizerError, setOptimizerError] = useState('')



  function openRoutePlanner(): void {

    setActivePage('Route Planner')

  }



  function clearOptimizationResult(): void {

    setOptimizedRoute([])

    setOptimizedDistance(null)
    setOptimizedDuration(null)
    setOptimizedDuration(null)
    setOriginalDistance(null)
    setOptimizedGeometry([])

    setOptimizerError('')

  }



  async function searchWarehouse(): Promise<void> {

    if (!warehouseQuery.trim()) {

      setWarehouseSearchError('Enter a warehouse address first.')

      return

    }



    setIsSearchingWarehouse(true)

    setWarehouseSearchError('')

    setWarehouseResults([])



    try {

      const results = await window.api.geocodeAddress(warehouseQuery)

      setWarehouseResults(results)



      if (results.length === 0) {

        setWarehouseSearchError(

          'No matching addresses found. Try adding a city or postal code.'

        )

      }

    } catch (error) {

      setWarehouseSearchError(

        error instanceof Error ? error.message : 'Address search failed.'

      )

    } finally {

      setIsSearchingWarehouse(false)

    }

  }



  function selectWarehouse(result: GeocodeResult): void {

    const selectedWarehouse: MapLocation = {

      id: Date.now(),

      name: result.displayName,

      lat: result.lat,

      lng: result.lng

    }



    setWarehouse(selectedWarehouse)



    // OSRM and the C++ integration use geographic coordinates:

    // x = longitude, y = latitude.

    setLocations((previousLocations) =>

      previousLocations.map((location) => ({

        ...location,

        x: location.lng,

        y: location.lat

      }))

    )



    setWarehouseQuery(result.displayName)

    setWarehouseResults([])

    setWarehouseSearchError('')

    clearOptimizationResult()

  }



  function startWarehouseMapSelection(): void {

    setIsSelectingWarehouse(true)

    setSelectedWarehousePoint(null)

    setOptimizerError('')

  }



  function handleWarehouseMapClick(point: WarehouseMapPoint): void {

    setSelectedWarehousePoint(point)

  }



  function confirmWarehouseMapSelection(): void {

    if (!selectedWarehousePoint) {

      setOptimizerError('Click the map to select your warehouse first.')

      return

    }



    const selectedWarehouse: MapLocation = {

      id: Date.now(),

      name: 'Map-selected Warehouse',

      lat: selectedWarehousePoint.lat,

      lng: selectedWarehousePoint.lng

    }



    setWarehouse(selectedWarehouse)

    setLocations((previousLocations) =>

      previousLocations.map((location) => ({

        ...location,

        x: location.lng,

        y: location.lat

      }))

    )

    setWarehouseQuery(

      `Map-selected warehouse (${selectedWarehouse.lat.toFixed(6)}, ${selectedWarehouse.lng.toFixed(6)})`

    )

    setWarehouseResults([])

    setWarehouseSearchError('')

    setSelectedWarehousePoint(null)

    setIsSelectingWarehouse(false)

    clearOptimizationResult()

  }



  async function searchDeliveryAddress(): Promise<void> {

    if (!warehouse) {

      setDeliverySearchError('Select a warehouse before adding deliveries.')

      return

    }



    if (!deliveryQuery.trim()) {

      setDeliverySearchError('Enter a delivery address first.')

      return

    }



    setIsSearchingDelivery(true)

    setDeliverySearchError('')

    setDeliveryResults([])



    try {

      const results = await window.api.geocodeAddress(deliveryQuery)

      setDeliveryResults(results)



      if (results.length === 0) {

        setDeliverySearchError(

          'No matching addresses found. Try adding a city or postal code.'

        )

      }

    } catch (error) {

      setDeliverySearchError(

        error instanceof Error ? error.message : 'Address search failed.'

      )

    } finally {

      setIsSearchingDelivery(false)

    }

  }



  function addDelivery(result: GeocodeResult): void {

    if (!warehouse) {

      setDeliverySearchError('Select a warehouse first.')

      return

    }



    if (locations.length >= 15) {

      setOptimizerError(

        'The C++ optimizer currently supports a maximum of 15 delivery locations.'

      )

      return

    }



    const newLocation: DeliveryLocation = {

      id: Date.now(),

      name: `Delivery ${locations.length + 1}`,

      address: result.displayName,

      city: result.city,

      x: result.lng,

      y: result.lat,

      lat: result.lat,

      lng: result.lng

    }



    clearOptimizationResult()

    setLocations((previousLocations) => [...previousLocations, newLocation])

    setDeliveryQuery('')

    setDeliveryResults([])

    setDeliverySearchError('')

  }



  function resetRouteLocations(): void {

    setWarehouse(null)

    setIsSelectingWarehouse(false)

    setSelectedWarehousePoint(null)

    setLocations([])

    setWarehouseQuery('')

    setWarehouseResults([])

    setWarehouseSearchError('')

    setDeliveryQuery('')

    setDeliveryResults([])

    setDeliverySearchError('')

    clearOptimizationResult()

  }



  function removeLocation(id: number): void {

    clearOptimizationResult()

    setLocations((previousLocations) =>

      previousLocations.filter((location) => location.id !== id)

    )

  }



  async function optimizeRoute(): Promise<void> {

    if (!warehouse) {

      setOptimizerError('Please select a warehouse address first.')

      return

    }



    if (locations.length === 0) {

      setOptimizerError('Please add at least one delivery location.')

      return

    }



    setIsOptimizing(true)

    setOptimizerError('')

    setOptimizedRoute([])

    setOptimizedDistance(null)

    setOptimizedGeometry([])



    try {

      const result = await window.api.optimizeRoute({
        warehouse: {
          name: 'Warehouse',
          x: warehouse.lng,
          y: warehouse.lat
        },
        locations: locations.map(({ name, x, y }) => ({
          name,
          x,
          y
        }))
      })



      setOptimizedRoute(result.route)



      // The backend returns meters; the UI displays kilometers.

      setOptimizedDistance(result.distance / 1000)
      setOptimizedDuration(result.duration)
       setOriginalDistance(result.originalDistance / 1000)
      setOptimizedGeometry(result.geometry)

    } catch (error) {

      setOptimizerError(

        error instanceof Error ? error.message : 'Failed to optimize route.'

      )

    } finally {

      setIsOptimizing(false)

    }

  }



  const mapLocations: MapLocation[] = locations.map(

    ({ id, name, lat, lng }) => ({

      id,

      name,

      lat,

      lng

    })

  )



  const mapRouteNames =

    optimizedRoute.length > 0 && warehouse

      ? [

          'Warehouse',

          ...optimizedRoute.filter((name) => name !== 'Warehouse'),

          'Warehouse'

        ]

      : optimizedRoute

const distanceSaved =
  originalDistance !== null && optimizedDistance !== null
    ? originalDistance - optimizedDistance
    : null

  return (

    <div className="app">

      <aside className="sidebar">

        <div className="logo">

          <span className="logo-icon">O</span>

          <span>OptiRoute</span>

        </div>



        <nav className="navigation">

          {['Dashboard', 'Route Planner', 'Deliveries', 'Locations'].map(

            (page) => (

              <button

                key={page}

                className={`nav-item ${activePage === page ? 'active' : ''}`}

                onClick={() => setActivePage(page)}

              >

                {page}

              </button>

            )

          )}

        </nav>



        <div className="sidebar-bottom">

          <span>OptiRoute AI</span>

          <small>Route Intelligence</small>

        </div>

      </aside>



      <main className="main-content">

        {activePage === 'Dashboard' ? (

          <>

            <header className="topbar">

              <div>

                <p className="eyebrow">DELIVERY MANAGEMENT</p>

                <h1>Dashboard</h1>

              </div>



              <div className="status">

                <span className="status-dot" />

                Engine ready

              </div>

            </header>



            <section className="welcome">

              <div>

                <p className="eyebrow">SMART ROUTE OPTIMIZATION</p>

                <h2>Plan smarter. Deliver faster.</h2>

                <p>

                  Optimize your delivery routes with intelligent route

                  planning.

                </p>

              </div>



              <button className="primary-button" onClick={openRoutePlanner}>

                + New Route

              </button>

            </section>



            <section className="stats-grid">

              <div className="stat-card">

                <p>Total Deliveries</p>

                <h3>{locations.length}</h3>

                <span>

                  {locations.length === 0

                    ? 'No deliveries added'

                    : 'Locations added'}

                </span>

              </div>



              <div className="stat-card">

                <p>Routes Planned</p>

                <h3>{optimizedDistance !== null ? 1 : 0}</h3>

                <span>

                  {optimizedDistance !== null

                    ? 'Route optimized'

                    : 'Start planning today'}

                </span>

              </div>



              <div className="stat-card">
  <p>Distance Saved</p>

  <h3>
    {distanceSaved !== null
      ? `${distanceSaved > 0 ? '+' : ''}${distanceSaved.toFixed(2)} km`
      : '—'}
  </h3>

  <span>
    {distanceSaved !== null
      ? distanceSaved > 0
        ? 'Less distance than original route'
        : distanceSaved === 0
          ? 'Same distance as original route'
          : 'Optimized route is longer than original'
      : 'Optimize a route to calculate savings'}
  </span>
</div>

            </section>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Route Overview</h2>

                  <p>Your optimized delivery route will appear here.</p>

                </div>

              </div>



              {optimizedDistance === null ? (

                <div className="empty-state">

                  <div className="empty-icon">⌖</div>

                  <h3>No route planned yet</h3>

                  <p>

                    Add delivery locations and let OptiRoute calculate the most

                    efficient route.

                  </p>

                  <button

                    className="secondary-button"

                    onClick={openRoutePlanner}

                  >

                    Create your first route

                  </button>

                </div>

              ) : (

                <div className="optimized-result">

                  <h3>Optimized Route</h3>

                  <p className="optimized-distance">

                    Total road distance: {optimizedDistance.toFixed(2)} km

                  </p>

        
<div className="route-summary-grid">
  <div className="route-summary-card">
    <span>Estimated driving time</span>
    <strong>
      {optimizedDuration !== null
        ? formatDuration(optimizedDuration)
        : '—'}
    </strong>
    <small>OSRM road estimate</small>
  </div>

  <div className="route-summary-card">
    <span>Delivery stops</span>
    <strong>{locations.length}</strong>
    <small>Locations in this route</small>
  </div>

  <div className="route-summary-card">
    <span>Starting warehouse</span>
    
<strong title={warehouse?.name || undefined}>
  {warehouse
    ? getWarehouseShortName(warehouse.name)
    : 'Not selected'}
</strong>

    <small>Route starts and ends here</small>
  </div>
</div>


                  <div className="route-sequence">

                    {optimizedRoute.map((location, index) => (

                      <div

                        className="route-step"

                        key={`${location}-${index}`}

                      >

                        <span className="location-number">{index + 1}</span>

                        <span>

                          {location === 'Warehouse'

                            ? 'Warehouse'

                            : `${location} — ${

                                locations.find((item) => item.name === location)?.city ||

                                'City unavailable'

                              }`}

                        </span>

                      </div>

                    ))}

                  </div>



                  <button

                    className="secondary-button"

                    onClick={openRoutePlanner}

                  >

                    View Route Planner

                  </button>

                </div>

              )}

            </section>

          </>

        ) : activePage === 'Route Planner' ? (

          <>

            <header className="topbar">

              <div>

                <p className="eyebrow">ROUTE MANAGEMENT</p>

                <h1>Route Planner</h1>

              </div>



              <div className="status">

                <span className="status-dot" />

                {locations.length} deliveries

              </div>

            </header>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Set your warehouse</h2>

                  <p>Search for the starting address of your delivery route.</p>

                </div>

              </div>



              <form

                className="location-form"

                onSubmit={(event) => {

                  event.preventDefault()

                  void searchWarehouse()

                }}

              >

                <label>

                  Warehouse address

                  <input

                    type="text"

                    placeholder="Enter warehouse address, city or postal code"

                    value={warehouseQuery}

                    onChange={(event) => setWarehouseQuery(event.target.value)}

                    required

                  />

                </label>



                <button

                  className="primary-button"

                  type="submit"

                  disabled={isSearchingWarehouse}

                >

                  {isSearchingWarehouse ? 'Searching...' : 'Find Warehouse'}

                </button>

              </form>



              {warehouseSearchError && (

                <p className="optimizer-error">{warehouseSearchError}</p>

              )}



              {warehouseResults.length > 0 && (

                <div className="location-list">

                  {warehouseResults.map((result) => (

                    <div className="location-item" key={result.placeId}>

                      <div className="location-details">

                        <h3>{result.displayName}</h3>

                        <p>

                          {result.lat.toFixed(6)}, {result.lng.toFixed(6)}

                        </p>

                      </div>



                      <button

                        className="secondary-button"

                        onClick={() => selectWarehouse(result)}

                      >

                        Select Warehouse

                      </button>

                    </div>

                  ))}

                </div>

              )}



              {warehouse && (

                <div className="map-instructions">

                  <strong>Warehouse selected</strong>

                  <p>{warehouse.name}</p>

                </div>

              )}

            </section>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Add delivery addresses</h2>

                  <p>

                    Search for each delivery address and select the matching

                    result. You can add up to 15 delivery locations.

                  </p>

                </div>

              </div>



              <form

                className="location-form"

                onSubmit={(event) => {

                  event.preventDefault()

                  void searchDeliveryAddress()

                }}

              >

                <label>

                  Delivery address

                  <input

                    type="text"

                    placeholder="Enter delivery address, city or postal code"

                    value={deliveryQuery}

                    onChange={(event) => setDeliveryQuery(event.target.value)}

                    required

                    disabled={!warehouse}

                  />

                </label>



                <button

                  className="primary-button"

                  type="submit"

                  disabled={!warehouse || isSearchingDelivery}

                >

                  {isSearchingDelivery ? 'Searching...' : 'Find Address'}

                </button>

              </form>



              {deliverySearchError && (

                <p className="optimizer-error">{deliverySearchError}</p>

              )}



              {deliveryResults.length > 0 && (

                <div className="location-list">

                  {deliveryResults.map((result) => (

                    <div className="location-item" key={result.placeId}>

                      <div className="location-details">

                        <h3>{result.displayName}</h3>

                        <p>

                          {result.lat.toFixed(6)}, {result.lng.toFixed(6)}

                        </p>

                      </div>



                      <button

                        className="secondary-button"

                        onClick={() => addDelivery(result)}

                        disabled={locations.length >= 15}

                      >

                        Add Delivery

                      </button>

                    </div>

                  ))}

                </div>

              )}

            </section>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Route Map</h2>

                  <p>

                    Your warehouse and selected delivery addresses appear on

                    the map.

                  </p>

                </div>

              </div>



              <div className="map-actions">

                {!isSelectingWarehouse ? (

                  <button

                    className="secondary-button"

                    onClick={startWarehouseMapSelection}

                  >

                    Choose Warehouse on Map

                  </button>

                ) : (

                  <>

                    <p className="map-instructions">

                      Click the exact farm entrance or loading point on the map.

                    </p>

                    <button

                      className="primary-button"

                      onClick={confirmWarehouseMapSelection}

                      disabled={!selectedWarehousePoint}

                    >

                      Confirm Warehouse

                    </button>

                    <button

                      className="secondary-button"

                      onClick={() => {

                        setIsSelectingWarehouse(false)

                        setSelectedWarehousePoint(null)

                      }}

                    >

                      Cancel

                    </button>

                  </>

                )}

              </div>



              <DeliveryMap

                warehouse={warehouse}

                locations={mapLocations}

                routeNames={mapRouteNames}

                geometry={optimizedGeometry}

                selectingWarehouse={isSelectingWarehouse}

                selectedWarehousePoint={selectedWarehousePoint}

                onWarehouseMapClick={handleWarehouseMapClick}

              />



              <div className="map-actions">

                <button

                  className="secondary-button"

                  onClick={resetRouteLocations}

                  disabled={!warehouse && locations.length === 0}

                >

                  Reset Route Locations

                </button>

              </div>

            </section>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Delivery Locations</h2>

                  <p>

                    {locations.length} location

                    {locations.length !== 1 ? 's' : ''} added

                  </p>

                </div>

              </div>



              {locations.length === 0 ? (

                <div className="empty-state">

                  <h3>No deliveries added</h3>

                  <p>

                    Search for a delivery address above and select Add

                    Delivery.

                  </p>

                </div>

              ) : (

                <div className="location-list">

                  {locations.map((location, index) => (

                    <div className="location-item" key={location.id}>

                      <div className="location-number">{index + 1}</div>



                      <div className="location-details">

                        <h3>{location.name}</h3>

                        <p>{location.address}</p>

                        <p>

                          Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}

                        </p>

                      </div>



                      <button

                        className="remove-location-button"

                        onClick={() => removeLocation(location.id)}

                      >

                        Remove

                      </button>

                    </div>

                  ))}

                </div>

              )}

            </section>



            <section className="route-section">

              <div className="section-heading">

                <div>

                  <h2>Route Optimization</h2>

                  <p>

                    Calculate the delivery order using your C++ optimization

                    engine.

                  </p>

                </div>

              </div>



              <button

                className="primary-button"

                onClick={() => void optimizeRoute()}

                disabled={!warehouse || locations.length === 0 || isOptimizing}

              >

                {isOptimizing ? 'Optimizing route...' : 'Optimize Route'}

              </button>



              {optimizerError && (

                <p className="optimizer-error">{optimizerError}</p>

              )}



              {optimizedDistance !== null && (

                <div className="optimized-result">

                  <h3>Optimized Route</h3>

                  <p className="optimized-distance">

                    Total road distance: {optimizedDistance.toFixed(2)} km

                  </p>



                  <div className="route-sequence">

                    {optimizedRoute.map((location, index) => (

                      <div

                        className="route-step"

                        key={`${location}-${index}`}

                      >

                        <span className="location-number">{index + 1}</span>

                        <span>

                          {location === 'Warehouse'

                            ? 'Warehouse'

                            : `${location} — ${

                                locations.find((item) => item.name === location)?.city ||

                                'City unavailable'

                              }`}

                        </span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </section>

          </>

        ) : (

          <header className="topbar">

            <div>

              <p className="eyebrow">DELIVERY MANAGEMENT</p>

              <h1>{activePage}</h1>

              <p>This section will be implemented in a future step.</p>

            </div>

          </header>

        )}

      </main>

    </div>

  )

}



export default App
