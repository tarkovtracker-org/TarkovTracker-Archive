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

const includesAny = (value: string, substrings: string[]) => {
  return substrings.some((substring) => value.includes(substring));
};

const vendorChunkMatchers = [
  { name: 'vuetify', match: (id: string) => id.includes('vuetify') },
  { name: 'apollo-graphql', match: (id: string) => includesAny(id, ['@apollo', 'graphql']) },
  { name: 'firebase', match: (id: string) => id.includes('firebase') },
  { name: 'd3', match: (id: string) => id.includes('d3') },
  { name: 'pinia', match: (id: string) => id.includes('pinia') },
  { name: 'vue-router', match: (id: string) => id.includes('vue-router') },
  { name: 'vue-i18n', match: (id: string) => includesAny(id, ['vue-i18n', '@intlify']) },
  { name: 'vuefire', match: (id: string) => includesAny(id, ['vuefire', 'rxfire']) },
  { name: 'graphology', match: (id: string) => id.includes('graphology') },
];

const appChunkMatchers = [
  { name: 'stores', match: (id: string) => id.includes('/src/stores/') },
  {
    name: 'composables',
    match: (id: string) => id.includes('/src/composables/') && !id.includes('tarkovdata'),
  },
  {
    name: 'tarkov-data',
    match: (id: string) =>
      includesAny(id, [
        '/src/composables/tarkovdata',
        '/src/composables/api/',
        '/src/composables/data/',
      ]),
  },
  { name: 'services', match: (id: string) => id.includes('/src/services/') },
];

const matchChunk = (
  id: string,
  matchers: { name: string; match: (value: string) => boolean }[]
) => {
  const matcher = matchers.find(({ match }) => match(id));
  return matcher?.name;
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
            const vendorChunk = matchChunk(id, vendorChunkMatchers);
            if (vendorChunk) {
              return vendorChunk;
            }
          }
          const appChunk = matchChunk(id, appChunkMatchers);
          return appChunk;
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
