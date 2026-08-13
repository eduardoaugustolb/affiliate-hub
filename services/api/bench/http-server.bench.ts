import { type HttpServer, HttpStatus } from '@affiliate-hub/shared-kernel'
import autocannon from 'autocannon'
import { type Contender, contenders } from './contenders'

const ROUNDS = 15
const DURATION_SECONDS = 3
const WARMUP_SECONDS = 2
const CONNECTIONS = 50
const STARTUP_TIMEOUT_MS = 2000

type Route = 'get' | 'post'

interface RouteSample {
  reqPerSec: number
  p50: number
  p97_5: number
  p99: number
}

function registerBenchRoutes(server: HttpServer): void {
  server.get('/ping', async (_request, response) => {
    response.status(HttpStatus.OK).sendJson({ message: 'Pong', pong: true })
  })

  server.post('/echo', async (_request, response) => {
    response.status(HttpStatus.OK).sendJson({ message: 'Echo received', received: null })
  })
}

async function waitUntilReady(url: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }

  throw new Error(`Server em ${url} não respondeu em ${STARTUP_TIMEOUT_MS}ms`)
}

function toSample(result: autocannon.Result): RouteSample {
  return {
    reqPerSec: result.requests.average,
    p50: result.latency.p50,
    p97_5: result.latency.p97_5,
    p99: result.latency.p99,
  }
}

// Sobe o server uma única vez (criar/derrubar Bun.serve dezenas de vezes na
// mesma process batia num crash nativo do Bun) e esquenta JIT/route
// matching/caches internos antes de qualquer round valer pra medição.
async function warmUp(contender: Contender): Promise<HttpServer> {
  const server = contender.createServer()
  registerBenchRoutes(server)
  await server.listen(contender.port)

  const baseUrl = `http://localhost:${contender.port}`
  await waitUntilReady(`${baseUrl}/ping`)

  await autocannon({ url: `${baseUrl}/ping`, connections: CONNECTIONS, duration: WARMUP_SECONDS })
  await autocannon({
    url: `${baseUrl}/echo`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: 'world' }),
    connections: CONNECTIONS,
    duration: WARMUP_SECONDS,
  })

  return server
}

async function measureGet(baseUrl: string): Promise<RouteSample> {
  const result = await autocannon({
    url: `${baseUrl}/ping`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
  })
  return toSample(result)
}

async function measurePost(baseUrl: string): Promise<RouteSample> {
  const result = await autocannon({
    url: `${baseUrl}/echo`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: 'world' }),
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
  })
  return toSample(result)
}

// A ordem GET/POST também é sorteada — senão POST sempre herda o aquecimento
// (ou fadiga térmica) deixado pelos 3s de GET que rodaram logo antes.
async function measure(contender: Contender): Promise<Record<Route, RouteSample>> {
  const baseUrl = `http://localhost:${contender.port}`
  const routeOrder = shuffled<Route>(['get', 'post'])
  const results = {} as Record<Route, RouteSample>

  for (const route of routeOrder) {
    results[route] = route === 'get' ? await measureGet(baseUrl) : await measurePost(baseUrl)
  }

  return results
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i] as T
    result[i] = result[j] as T
    result[j] = temp
  }
  return result
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  const avg = average(values)
  return Math.sqrt(average(values.map((value) => (value - avg) ** 2)))
}

// Coeficiente de variação: desvio padrão relativo ao próprio valor médio.
// Um CV baixo (ex: ~1-2%) diz que a diferença entre servers é sinal real;
// um CV alto (ex: ~8%) diz que os rounds estão espalhados demais pra confiar
// no ranking.
function coefficientOfVariation(values: number[]): number {
  return (standardDeviation(values) / average(values)) * 100
}

function printSummary(samples: Map<string, Record<Route, RouteSample[]>>): void {
  console.log(`\nmediana dos ${ROUNDS} rounds (não a média de um round só):\n`)
  console.log(
    `${'server · rota'.padEnd(28)} ${'median req/s'.padStart(13)} ${'CV'.padStart(6)}   ${'p50'.padStart(5)}  ${'p97.5'.padStart(6)}  ${'p99'.padStart(5)}`,
  )
  console.log('-'.repeat(80))

  for (const contender of contenders) {
    const routeSamples = samples.get(contender.name)
    if (!routeSamples) continue

    for (const route of ['get', 'post'] as const) {
      const list = routeSamples[route]
      const reqSecValues = list.map((s) => s.reqPerSec)
      const reqSec = median(reqSecValues).toFixed(0)
      const cv = coefficientOfVariation(reqSecValues).toFixed(1)
      const p50 = median(list.map((s) => s.p50)).toFixed(2)
      const p975 = median(list.map((s) => s.p97_5)).toFixed(2)
      const p99 = median(list.map((s) => s.p99)).toFixed(2)
      const label = `${contender.name} · ${route === 'get' ? 'GET /ping' : 'POST /echo'}`

      console.log(
        `${label.padEnd(28)} ${reqSec.padStart(10)} r/s ${cv.padStart(5)}% ${p50.padStart(5)}ms ${p975.padStart(6)}ms ${p99.padStart(5)}ms`,
      )
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `${ROUNDS} rounds · ordem de contenders e de rota sorteada a cada round · ${CONNECTIONS} conexões · ${DURATION_SECONDS}s por rota · ${WARMUP_SECONDS}s de warmup\n`,
  )

  console.log('subindo e aquecendo todos os servers (uma vez só)...')
  const servers = new Map<string, HttpServer>()
  for (const contender of contenders) {
    servers.set(contender.name, await warmUp(contender))
  }

  const samples = new Map<string, Record<Route, RouteSample[]>>()
  for (const contender of contenders) {
    samples.set(contender.name, { get: [], post: [] })
  }

  try {
    for (let round = 1; round <= ROUNDS; round++) {
      const order = shuffled(contenders)
      console.log(`round ${round}/${ROUNDS} — ordem: ${order.map((c) => c.name).join(' → ')}`)

      for (const contender of order) {
        const result = await measure(contender)
        samples.get(contender.name)?.get.push(result.get)
        samples.get(contender.name)?.post.push(result.post)
      }
    }
  } finally {
    console.log('\nderrubando todos os servers...')
    for (const server of servers.values()) {
      await server.stop()
    }
  }

  printSummary(samples)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
