const migrationCommands = [
  ['bun', 'run', '--filter=@affiliate-hub/catalog', 'db:migrate'],
  ['bun', 'run', '--filter=@affiliate-hub/identity-access', 'db:migrate'],
  ['bun', 'run', '--filter=@affiliate-hub/link-redirect', 'db:migrate'],
] as const

for (const command of migrationCommands) {
  const child = Bun.spawn(command, {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await child.exited

  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
