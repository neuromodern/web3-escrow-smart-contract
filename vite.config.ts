import { defineConfig } from 'vite';

export default defineConfig({
  // Suppress the import.meta warning in IIFE format
  define: {
    'import.meta': '{}'
  },
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4000, 
    
    // Force Vite to bundle all CSS into a single file
    cssCodeSplit: false, 
    
    rollupOptions: {
      output: {
        format: 'iife',
        // Output name for the JS bundle
        entryFileNames: 'app.js', 
        
        // Explicitly tell the bundler how to name asset files (CSS, images, etc.)
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            // Force the CSS file to be named main.css
            return 'main.css'; 
          }
          // Keep the default naming convention for other assets like fonts or images
          return 'assets/[name]-[hash][extname]'; 
        }
      }
    }
  }
});