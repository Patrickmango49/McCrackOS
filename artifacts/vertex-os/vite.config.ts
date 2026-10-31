import path from 'path';
import { createReadStream, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { handleWispUpgrade } from './wisp-server.mjs';

const appRoot = import.meta.dirname;
const proxyAssets = new Map<string, string>([
  ['/scramjet/scramjet.js', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet/dist/scramjet.js')],
  ['/scramjet/scramjet.wasm', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm')],
  ['/controller/controller.api.js', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js')],
  ['/controller/controller.sw.js', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet-controller/dist/controller.sw.js')],
  ['/controller/controller.inject.js', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet-controller/dist/controller.inject.js')],
  ['/utils/scramjet-utils.js', path.join(appRoot, 'node_modules/@mercuryworkshop/scramjet-utils/dist/scramjet-utils.js')],
]);

function scramjetRuntimePlugin(): Plugin {
  const serveProxyAsset = (server: ViteDevServer) => {
    server.middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (pathname.endsWith('epoxy.wasm')) {
        response.setHeader('Content-Type', 'application/wasm');
        response.setHeader('Cache-Control', 'public, max-age=3600');
        createReadStream(path.join(appRoot, 'public/assets/epoxy.wasm')).on('error', next).pipe(response);
        return;
      }
      const file = proxyAssets.get(pathname);
      if (!file) {
        next();
        return;
      }
      response.setHeader('Content-Type', pathname.endsWith('.wasm') ? 'application/wasm' : 'text/javascript; charset=utf-8');
      response.setHeader('Cache-Control', 'public, max-age=3600');
      createReadStream(file).on('error', next).pipe(response);
    });
  };

  const attachWisp = (server: { httpServer: ViteDevServer['httpServer'] | PreviewServer['httpServer'] }) => {
    server.httpServer?.on('upgrade', handleWispUpgrade);
  };

  return {
    name: 'vertex-scramjet-runtime',
    configureServer(server) {
      serveProxyAsset(server);
      attachWisp(server);
    },
    configurePreviewServer(server) {
      attachWisp(server);
    },
    generateBundle() {
      for (const [fileName, sourcePath] of proxyAssets) {
        this.emitFile({
          type: 'asset',
          fileName: fileName.slice(1),
          source: readFileSync(sourcePath),
        });
      }
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/VertexOS/';

export default defineConfig(async ({ command, isPreview }) => ({
  base: !isPreview && command === 'serve' ? '/' : basePath,
  plugins: [
    scramjetRuntimePlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
