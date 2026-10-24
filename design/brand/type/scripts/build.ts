// Bun is the entry point; Python provides the installed font engineering tools.
const script = new URL('./build.py', import.meta.url).pathname;
const process = Bun.spawn(['python3', script, ...Bun.argv.slice(2)], { stdout: 'inherit', stderr: 'inherit' });
const code = await process.exited;
if (code !== 0) throw new Error(`Font build failed (${code})`);
