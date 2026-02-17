import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, mkdirSync } from 'fs';

function copyExtensionAssets() {
  const dist = resolve(__dirname, 'dist');
  copyFileSync(
    resolve(__dirname, 'src/manifest.json'),
    resolve(dist, 'manifest.json'),
  );
  mkdirSync(resolve(dist, 'icons'), { recursive: true });
  cpSync(resolve(__dirname, 'static/icons'), resolve(dist, 'icons'), {
    recursive: true,
  });
}

export default defineConfig(() => {
  const target = process.env.BUILD_TARGET ?? 'popup';

  if (target === 'background') {
    return {
      resolve: {
        alias: { '@': resolve(__dirname, 'src') },
      },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/background/index.ts'),
          formats: ['iife'],
          name: 'background',
          fileName: () => 'js/background.js',
        },
        rollupOptions: {
          output: {
            extend: true,
          },
        },
      },
      plugins: [
        {
          name: 'copy-assets-after-background',
          writeBundle() {
            copyExtensionAssets();
          },
        },
      ],
    };
  }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    base: '',
    root: resolve(__dirname, 'src/popup'),
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'src/popup/popup.html'),
        output: {
          entryFileNames: 'js/popup.js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
