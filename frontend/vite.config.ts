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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(getCommitHash()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(getBuildTime()),
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group specific large vendors into their own chunks
            if (id.includes('vuetify')) {
              return 'vuetify';
            }
            if (id.includes('@apollo') || id.includes('graphql')) {
              return 'apollo-graphql';
            }
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('d3')) {
              return 'd3';
            }
            // Split other common vendors
            if (id.includes('pinia')) {
              return 'pinia';
            }
            if (id.includes('vue-router')) {
              return 'vue-router';
            }
            if (id.includes('vue-i18n') || id.includes('@intlify')) {
              return 'vue-i18n';
            }
            if (id.includes('vuefire') || id.includes('rxfire')) {
              return 'vuefire';
            }
            if (id.includes('graphology')) {
              return 'graphology';
            }
            // Let Vite handle other node_modules with its default chunking strategy
          }
          // Split application code by feature
          if (id.includes('/src/stores/')) {
            return 'stores';
          }
          if (id.includes('/src/composables/') && !id.includes('tarkovdata')) {
            return 'composables';
          }
          if (id.includes('/src/composables/tarkovdata') || 
              id.includes('/src/composables/api/') ||
              id.includes('/src/composables/data/')) {
            return 'tarkov-data';
          }
          if (id.includes('/src/services/')) {
            return 'services';
          }
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
