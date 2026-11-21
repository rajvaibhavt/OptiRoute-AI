
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { geocodeAddress } from './geocoder'
interface RouteLocation {
  name: string
  x: number
  y: number
}

interface RouteOptimizationResult {
  distance: number
  route: string[]
}

function runCppOptimizer(
  locations: RouteLocation[]
): Promise<RouteOptimizationResult> {
  return new Promise((resolve, reject) => {
    // In development, the C++ executable is in the project root.
    // Packaged path will be configured when we prepare the installer.
    const executablePath = app.isPackaged
      ? join(process.resourcesPath, 'cpp-engine', 'optiroute.exe')
      : join(app.getAppPath(), '..', 'cpp-engine', 'optiroute.exe')

    if (!existsSync(executablePath)) {
      reject(new Error(`C++ optimizer not found: ${executablePath}`))
      return
    }

    const warehouse: RouteLocation = {
      name: 'Warehouse',
      x: 0,
      y: 0
    }

    const allLocations = [warehouse, ...locations]

    const input = `${locations.length}\n${locations
      .map((location) => `${location.name}\n${location.x} ${location.y}`)
      .join('\n')}\n`

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

      const distanceLine = stdout
        .split(/\r?\n/)
        .find((line) => line.startsWith('DISTANCE '))

      const routeLine = stdout
        .split(/\r?\n/)
        .find((line) => line.startsWith('ROUTE '))

      if (!distanceLine || !routeLine) {
        reject(new Error(`Invalid optimizer output: ${stdout}`))
        return
      }

      const distance = Number(distanceLine.split(/\s+/)[1])

      const routeIndexes = routeLine
        .split(/\s+/)
        .slice(1)
        .map(Number)

      if (!Number.isFinite(distance) || routeIndexes.some((index) => !Number.isInteger(index))) {
        reject(new Error('Optimizer returned invalid route data'))
        return
      }

      const route = routeIndexes.map((index) => {
        const location = allLocations[index]

        if (!location) {
          throw new Error(`Optimizer returned unknown location index: ${index}`)
        }

        return location.name
      })

      resolve({ distance, route })
    })

    optimizerProcess.stdin.end(input)
  })
}

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.optiroute.ai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Existing IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Route optimizer IPC handler
  ipcMain.handle(
    'route:optimize',
    async (_event, locations: RouteLocation[]) => {
      if (!Array.isArray(locations) || locations.length > 15) {
        throw new Error('Please provide between 0 and 15 delivery locations')
      }

      for (const location of locations) {
        if (
          typeof location.name !== 'string' ||
          !location.name.trim() ||
          typeof location.x !== 'number' ||
          !Number.isFinite(location.x) ||
          typeof location.y !== 'number' ||
          !Number.isFinite(location.y)
        ) {
          throw new Error('Each location must have a name and valid X/Y coordinates')
        }
      }

      return runCppOptimizer(locations)
    }
  )

  ipcMain.handle('geocode:address', async (_event, query: unknown) => {
    if (typeof query !== 'string') {
      throw new Error('Address query must be text.')
    }

    return geocodeAddress(query)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
