const [reportPath] = Bun.argv.slice(2)

if (!reportPath) {
  throw new Error('Usage: bun run scripts/assertCoverage.ts <lcov-report-path>')
}

const report = await Bun.file(reportPath).text()

function totalFor(metric: 'LF' | 'LH' | 'FNF' | 'FNH'): number {
  return report
    .split('\n')
    .filter((line) => line.startsWith(`${metric}:`))
    .reduce((total, line) => total + Number(line.slice(metric.length + 1)), 0)
}

const lines = { covered: totalFor('LH'), total: totalFor('LF') }
const functions = { covered: totalFor('FNH'), total: totalFor('FNF') }
const minimum = 0.9

const metrics = [
  { name: 'linhas', ...lines },
  { name: 'funções', ...functions },
]

for (const metric of metrics) {
  if (metric.total === 0) {
    throw new Error(`O relatório LCOV não contém dados de ${metric.name}.`)
  }
}

const summary = metrics
  .map((metric) => `${metric.name}: ${((metric.covered / metric.total) * 100).toFixed(2)}%`)
  .join(', ')

console.log(`Cobertura global, ${summary}. Mínimo exigido: 90.00%.`)

const failures = metrics.filter((metric) => metric.covered / metric.total < minimum)
if (failures.length > 0) {
  throw new Error(`Cobertura abaixo de 90%: ${failures.map((metric) => metric.name).join(', ')}.`)
}
