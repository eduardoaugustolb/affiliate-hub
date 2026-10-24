const script = new URL('./validate.py', import.meta.url).pathname;
const process = Bun.spawn(['python3', script], { stdout: 'inherit', stderr: 'inherit' });
if (await process.exited !== 0) throw new Error('Font validation failed');
