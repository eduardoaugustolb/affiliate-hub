import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const packagesRoot = join(root, 'packages')
const contextPackages = ['affiliate-sync', 'catalog', 'identity-access', 'link-redirect']
const forbiddenInfrastructure =
  /(^|\/)(adapters|infrastructure)(\/|$)|^(pg|knex|hono|elysia|fastify)(\/|$)/
const packageImport = /^@affiliate-hub\/([^/]+)/

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(path)
  }
  return files
}

function importsFrom(source: string): string[] {
  return [...source.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
}

const violations: string[] = []
for (const packageName of contextPackages) {
  const src = join(packagesRoot, packageName, 'src')
  for (const file of await sourceFiles(src)) {
    const layer = relative(src, file).split('/')[0]
    const imports = importsFrom(await readFile(file, 'utf8'))
    for (const specifier of imports) {
      const packageMatch = packageImport.exec(specifier)
      const importedPackage = packageMatch?.[1]
      if (
        layer === 'domain' &&
        (forbiddenInfrastructure.test(specifier) ||
          (importedPackage && importedPackage !== 'shared-kernel'))
      ) {
        violations.push(`${relative(root, file)}: domain cannot import ${specifier}`)
      }
      if (layer === 'application' && forbiddenInfrastructure.test(specifier)) {
        violations.push(`${relative(root, file)}: application cannot import ${specifier}`)
      }
      if (contextPackages.includes(importedPackage ?? '') && importedPackage !== packageName) {
        violations.push(
          `${relative(root, file)}: context ${packageName} cannot import ${specifier}`,
        )
      }
    }
  }
}

const adminPanel = join(root, 'services', 'admin-panel', 'src')
try {
  for (const file of await sourceFiles(adminPanel)) {
    for (const specifier of importsFrom(await readFile(file, 'utf8'))) {
      if (specifier.startsWith('@affiliate-hub/')) {
        violations.push(
          `${relative(root, file)}: admin-panel cannot import backend package ${specifier}`,
        )
      }
    }
  }
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
}

if (violations.length > 0) {
  console.error('Architectural dependency violations found:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Architecture dependency rules passed.')
