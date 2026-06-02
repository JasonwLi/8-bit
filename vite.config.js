import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    // multi-page: the game (index.html) + the sprite gallery (gallery.html), which
    // boots its own hidden Phaser instance to render procedural + AI textures.
    rollupOptions: {
      input: {
        main: 'index.html',
        gallery: 'gallery.html',
      },
    },
  },
});
