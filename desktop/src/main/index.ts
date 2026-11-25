

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { geocodeAddress } from './geocoder'

interface RouteLocation {

  name: string

  x: number // longitude

  y: number // latitude

}

interface RouteOptimizationResult {

  distance: number // meters
 duration: number // seconds
  route: string[]

  geometry: [number, number][] // Leaflet: [latitude, longitude]

}
interface OsrmTableResponse {

  code: string

  distances: (number | null)[][]

}

interface OsrmRouteResponse {

  code: string

  routes: {

    distance: number
    duration: number

    geometry: {

      coordinates: [number, number][]

    }

  }[]

}



// --------------------------------------------------

interface RouteOptimizationRequest {
  warehouse: RouteLocation
  locations: RouteLocation[]
}

// Public OSRM demo server.
// Use a suitable routing provider or self-host OSRM for production.

const OSRM_BASE_URL = 'https://router.project-osrm.org'



// --------------------------------------------------

// OSRM Table API

// Gets road distances between all locations.

// --------------------------------------------------



async function getRoadDistanceMatrix(

  locations: RouteLocation[]

): Promise<number[][]> {

  const coordinates = locations

    .map((location) => `${location.x},${location.y}`)

    .join(';')



  const url =

    `${OSRM_BASE_URL}/table/v1/driving/${coordinates}` +

    '?annotations=distance'



  const response = await fetch(url, {

    signal: AbortSignal.timeout(15000)

  })



  if (!response.ok) {

    throw new Error(`OSRM Table API failed: HTTP ${response.status}`)

  }



  const data = (await response.json()) as OsrmTableResponse



  if (data.code !== 'Ok' || !Array.isArray(data.distances)) {

    throw new Error('OSRM could not calculate road distances')

  }



  const expectedSize = locations.length



  if (

    data.distances.length !== expectedSize ||

    data.distances.some(

      (row) => !Array.isArray(row) || row.length !== expectedSize

    )

  ) {

    throw new Error('OSRM returned an invalid distance matrix')

  }



  const matrix: number[][] = []



  for (const row of data.distances) {

    const convertedRow: number[] = []



    for (const distance of row) {

      if (

        distance === null ||

        typeof distance !== 'number' ||

        !Number.isFinite(distance) ||

        distance < 0

      ) {

        throw new Error(

          'A road connection could not be found between some locations'

        )

      }



      convertedRow.push(distance)

    }



    matrix.push(convertedRow)

  }



  return matrix

}



// --------------------------------------------------

// OSRM Route API

// Gets road geometry for the optimized route.

// --------------------------------------------------




async function getRoadGeometry(
  orderedLocations: RouteLocation[]
): Promise<{
  geometry: [number, number][]
  duration: number
}> {
  const coordinates = orderedLocations
    .map((location) => `${location.x},${location.y}`)
    .join(';')

  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${coordinates}` +
    '?overview=full&geometries=geojson&steps=false'

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000)
  })

  if (!response.ok) {
    throw new Error(`OSRM Route API failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as OsrmRouteResponse

  if (
    data.code !== 'Ok' ||
    !Array.isArray(data.routes) ||
    !data.routes[0]?.geometry?.coordinates ||
    typeof data.routes[0].duration !== 'number'
  ) {
    throw new Error('OSRM could not generate the road route')
  }

  const route = data.routes[0]

  const geometry = route.geometry.coordinates.map(
    ([longitude, latitude]) => [latitude, longitude] as [number, number]
  )

  return {
    geometry,
    duration: route.duration
  }
}


// --------------------------------------------------

// Run C++ optimizer

// --------------------------------------------------



async function runCppOptimizer(

  warehouse: RouteLocation,

  locations: RouteLocation[]

): Promise<RouteOptimizationResult> {

  const allLocations = [warehouse, ...locations]



  // Handle empty delivery list.

  if (locations.length === 0) {

    return {

      distance: 0,
      duration: 0,

      route: ['Warehouse'],

      geometry: [[warehouse.y, warehouse.x]]

    }

  }



  // Step 1: Get road-distance matrix from OSRM.

  const matrix = await getRoadDistanceMatrix(allLocations)



  // Step 2: Prepare input for the C++ program.

  //

  // Expected C++ input:

  // deliveryCount

  // matrix row 1

  // matrix row 2

  // ...

  //

  // Distances are in meters.



  const input =

    `${locations.length}\n` +

    matrix.map((row) => row.join(' ')).join('\n') +

    '\n'



  // Step 3: Find C++ executable.

  const executablePath = app.isPackaged

    ? join(process.resourcesPath, 'cpp-engine', 'optiroute.exe')

    : join(app.getAppPath(), '..', 'cpp-engine', 'optiroute.exe')



  if (!existsSync(executablePath)) {

    throw new Error(`C++ optimizer not found: ${executablePath}`)

  }



  // Step 4: Execute C++ optimizer.

  const optimizerResult = await new Promise<{

    distance: number

    routeIndexes: number[]

  }>((resolve, reject) => {

    const optimizerProcess = spawn(executablePath, [], {

      stdio: ['pipe', 'pipe', 'pipe']

    })



    let stdout = ''

    let stderr = ''



    optimizerProcess.stdout.on('data', (data: Buffer) => {

      stdout += data.toString()

    })



    optimizerProcess.stderr.on('data', (data: Buffer) => {

      stderr += data.toString()

    })



    optimizerProcess.on('error', (error) => {

      reject(error)

    })



    optimizerProcess.on('close', (code) => {

      if (code !== 0) {

        reject(new Error(stderr || `Optimizer exited with code ${code}`))

        return

      }



      const outputLines = stdout.split(/\r?\n/)



      const distanceLine = outputLines.find((line) =>

        line.startsWith('DISTANCE ')

      )



      const routeLine = outputLines.find((line) =>

        line.startsWith('ROUTE ')

      )



      if (!distanceLine || !routeLine) {

        reject(new Error(`Invalid optimizer output: ${stdout}`))

        return

      }



      const distance = Number(distanceLine.split(/\s+/)[1])



      const routeIndexes = routeLine

        .split(/\s+/)

        .slice(1)

        .map(Number)



      // Expected route:

      // Warehouse -> deliveries -> Warehouse

      const expectedRouteLength = locations.length + 2



      if (

        !Number.isFinite(distance) ||

        distance < 0 ||

        routeIndexes.length !== expectedRouteLength ||

        routeIndexes.some(

          (index) =>

            !Number.isInteger(index) ||

            index < 0 ||

            index >= allLocations.length

        ) ||

        routeIndexes[0] !== 0 ||

        routeIndexes[routeIndexes.length - 1] !== 0

      ) {

        reject(new Error('Optimizer returned invalid route data'))

        return

      }



      resolve({

        distance,

        routeIndexes

      })

    })



    optimizerProcess.stdin.end(input)

  })



  // Step 5: Convert route indexes to locations.

  const orderedLocations = optimizerResult.routeIndexes.map((index) => {

    const location = allLocations[index]



    if (!location) {

      throw new Error(`Unknown location index: ${index}`)

    }



    return location

  })



  const route = orderedLocations.map((location) => location.name)



  // Step 6: Get actual road geometry from OSRM.

  const roadRoute = await getRoadGeometry(orderedLocations)



  // Step 7: Return result to frontend.

  return {

    distance: optimizerResult.distance,
    duration: roadRoute.duration,
    route,

    geometry: roadRoute.geometry,

  }

}



// --------------------------------------------------

// Create Electron window

// --------------------------------------------------



function createWindow(): void {

  const mainWindow = new BrowserWindow({

    title: 'OptiRoute AI',

    width: 900,

    height: 670,

    show: false,

    autoHideMenuBar: true,

    ...(process.platform === 'linux' ? { icon } : {}),

    webPreferences: {

      preload: join(__dirname, '../preload/index.js'),

      sandbox: false

    }

  })



  mainWindow.setTitle('OptiRoute AI')



  mainWindow.on('ready-to-show', () => {

    mainWindow.show()

  })



  mainWindow.webContents.setWindowOpenHandler((details) => {

    shell.openExternal(details.url)

    return { action: 'deny' }

  })



  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {

    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])

  } else {

    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))

  }

}



// --------------------------------------------------

// Application initialization

// --------------------------------------------------



app.whenReady().then(() => {

  electronApp.setAppUserModelId('com.optiroute.ai')



  app.on('browser-window-created', (_, window) => {

    optimizer.watchWindowShortcuts(window)

  })



  // Existing IPC test.

  ipcMain.on('ping', () => console.log('pong'))



  // ------------------------------------------------

  // Route optimization IPC

  // ------------------------------------------------



  ipcMain.handle(

    'route:optimize',

    async (_event, request: RouteOptimizationRequest) => {

      if (
        !request ||
        !request.warehouse ||
        !Array.isArray(request.locations) ||
        request.locations.length > 15
      ) {
        throw new Error(
          'Please provide a valid warehouse and between 0 and 15 delivery locations'
        )
      }

      const { warehouse, locations } = request

      const allInputLocations = [warehouse, ...locations]

      for (const location of allInputLocations) {

        if (

          !location ||

          typeof location.name !== 'string' ||

          !location.name.trim() ||

          location.name.includes('\n') ||

          location.name.includes('\r') ||

          typeof location.x !== 'number' ||

          !Number.isFinite(location.x) ||

          location.x < -180 ||

          location.x > 180 ||

          typeof location.y !== 'number' ||

          !Number.isFinite(location.y) ||

          location.y < -90 ||

          location.y > 90

        ) {

          throw new Error(

            'Each delivery must have a name and valid longitude/latitude coordinates'

          )

        }

      }



      // Keep the warehouse label consistent in the optimized route output.
      const selectedWarehouse: RouteLocation = {
        ...warehouse,
        name: 'Warehouse'
      }

      return runCppOptimizer(selectedWarehouse, locations)

    }

  )



  // ------------------------------------------------

  // Address geocoding IPC

  // ------------------------------------------------



  ipcMain.handle('geocode:address', async (_event, query: unknown) => {

    if (typeof query !== 'string') {

      throw new Error('Address query must be text.')

    }



    return geocodeAddress(query)

  })



  createWindow()



  app.on('activate', function () {

    if (BrowserWindow.getAllWindows().length === 0) {

      createWindow()

    }

  })

})



// --------------------------------------------------

// Close application

// --------------------------------------------------



app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {

    app.quit()

  }

})
