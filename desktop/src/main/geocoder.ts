
type NominatimItem = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
     state_district?: string
    state?: string
  }
}

export type GeocodeResult = {
  placeId: number
  displayName: string
   city: string
  lat: number
  lng: number
}

const endpoint = 'https://nominatim.openstreetmap.org/search'

const cache = new Map<string, GeocodeResult[]>()

let lastRequestAt = 0
let requestQueue: Promise<void> = Promise.resolve()

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function respectRateLimit(): Promise<void> {
  const nextRequest = requestQueue.then(async () => {
    const remaining = 1100 - (Date.now() - lastRequestAt)

    if (remaining > 0) {
      await wait(remaining)
    }

    lastRequestAt = Date.now()
  })

  requestQueue = nextRequest.catch(() => undefined)

  await nextRequest
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult[]> {
  if (typeof query !== 'string' || query.trim().length < 2) {
    throw new Error('Please enter a valid address.')
  }

  const normalizedQuery = query
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  const cached = cache.get(normalizedQuery)

  if (cached) {
    return cached
  }

  await respectRateLimit()

  const url = new URL(endpoint)

  url.searchParams.set('q', query.trim())
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '3')
  url.searchParams.set('addressdetails', '1')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent':
        'OptiRoute-AI/0.1 (https://github.com/rajvaibhavt/OptiRoute-AI)'
    },
    signal: AbortSignal.timeout(12000)
  })

  if (response.status === 429) {
    throw new Error(
      'Address search is temporarily rate-limited. Please wait and try again.'
    )
  }

  if (!response.ok) {
    throw new Error(
      `Address search failed with HTTP ${response.status}.`
    )
  }

  const data = (await response.json()) as NominatimItem[]

 const results = data
  .map((item) => ({
    placeId: Number(item.place_id),
    displayName: String(item.display_name),

    city:
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.municipality ||
      item.address?.county ||
      item.address?.state_district ||
      item.address?.state ||
      'City unavailable',

    lat: Number(item.lat),
    lng: Number(item.lon)
  }))
  .filter(
    (item) =>
      Number.isFinite(item.placeId) &&
      item.displayName.length > 0 &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
  )
  cache.set(normalizedQuery, results)

  return results
}
