import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4389,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response('Bad request', { status: 400 }); }
    const path = resolve(root, `.${pathname === '/' ? '/specimen.html' : pathname}`);
    if (!path.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
  },
});
console.log(`Black Hem Display: ${server.url}`);
