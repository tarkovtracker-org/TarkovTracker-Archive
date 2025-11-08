import path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import vuetify from 'vite-plugin-vuetify';
import { execSync } from 'child_process';
import { defineConfig, type Plugin } from 'vite';
// Get the directory name in an ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const formatGitError = (error: unknown) => {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    const parts: string[] = [];
    if (typeof code === 'string') {
      parts.push(code);
    }
    if (typeof message === 'string') {
      parts.push(message);
    }
    return parts.join(' - ') || 'unknown error';
  }
  return String(error);
};
let cachedCommitHash: string | undefined = undefined;
// Get git commit hash and build time
const getCommitHash = () => {
  if (cachedCommitHash !== undefined) {
    return cachedCommitHash;
  }
  if (process.env.VITE_COMMIT_HASH) {
    cachedCommitHash = process.env.VITE_COMMIT_HASH;
    return cachedCommitHash;
  }
  try {
    cachedCommitHash = execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (error) {
    console.warn('Skipping git commit hash lookup:', formatGitError(error));
    cachedCommitHash = 'unknown';
  }
  return cachedCommitHash;
};
const getBuildTime = () => {
  return new Date().toISOString();
};

// Plugin to defer non-critical CSS for better FCP
function deferNonCriticalCSS(): Plugin {
  return {
    name: 'defer-non-critical-css',
    enforce: 'post',
    transformIndexHtml(html) {
      // Only apply in production builds
      if (process.env.NODE_ENV !== 'production') {
        return html;
      }

      // Defer Vuetify and Scalar CSS (not needed for initial paint)
      let noscriptLinks = '';
      const transformedHtml = html.replace(
        /<link\s+rel="stylesheet"[^>]*href="[^"]*(?:vuetify-vendor|scalar-vendor)[^"]*"[^>]*>/g,
        (match) => {
          // Store original link for noscript fallback
          noscriptLinks += match;
          // Add media="print" to defer loading, then switch to "all" after load
          return match.replace(
            /rel="stylesheet"/,
            'rel="stylesheet" media="print" onload="this.media=\'all\'; this.onload=null;"'
          );
        }
      );

      // Add noscript fallback for deferred CSS
      if (noscriptLinks) {
        return transformedHtml.replace(
          '</head>',
          `<noscript>${noscriptLinks}</noscript></head>`
        );
      }

      return transformedHtml;
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    // 'qrcode' needs to be pre-bundled due to ESM/CJS interop issues;
    // Vite cannot analyze it statically, so we include it to avoid runtime errors.
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
    __VUE_PROD_DEVTOOLS__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(getCommitHash()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(getBuildTime()),
  },
  build: {
    sourcemap: 'hidden', // Generate source maps without linking them in bundle
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      // Prevent heavy chunks from being preloaded on every page
      // Only preload critical dependencies
      resolveDependencies: (filename, deps, { hostId: _hostId, hostType: _hostType }) => {
        // Filter out Scalar vendor chunk from preload (only needed on /api-docs route)
        // This saves ~1.1MB gzipped on initial page load
        return deps.filter((dep) => !dep.includes('scalar-vendor'));
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Use hashed names for font files to enable long-term immutable caching
          if (assetInfo.name?.endsWith('.woff2')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          // Default behavior for other assets
          return 'assets/[name]-[hash][extname]';
        },
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
    deferNonCriticalCSS(),
  ],
  server: {
    port: 3000,
  },
});
