import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import vuetify from 'vite-plugin-vuetify';
import { execSync } from 'child_process';

// Get the directory name in an ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get git commit hash and build time
const getCommitHash = () => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.warn('Could not get git commit hash:', error);
    return 'unknown';
  }
};

const getBuildTime = () => {
  return new Date().toISOString();
};

export default defineConfig({
  optimizeDeps: {
    include: ['qrcode'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: process.env.NODE_ENV !== 'production',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(getCommitHash()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(getBuildTime()),
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only split the heaviest vendors to improve performance
          // Everything else uses Vite's automatic chunking

          // Firebase (very heavy - split into own chunk)
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }

          // Vuetify runtime (heavy UI framework - split into own chunk)
          if (id.includes('node_modules/vuetify')) {
            return 'vuetify-vendor';
          }

          // Scalar API Reference (very heavy - only loads on API docs page)
          if (id.includes('node_modules/@scalar')) {
            return 'scalar-vendor';
          }

          // D3 (heavy graphing library)
          if (id.includes('node_modules/d3')) {
            return 'd3-vendor';
          }

          // Let Vite handle everything else automatically
        },
      },
    },
  },
  plugins: [
    vue(),
    vueI18n({
      include: path.resolve(__dirname, './src/locales/**'),
    }),
    vuetify({ autoImport: true }),
  ],
  server: {
    port: 3000,
  },
});
