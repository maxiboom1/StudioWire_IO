// Keep PostCSS intentionally small.
// Tailwind remains the styling engine for StudioWire IO.
// Autoprefixer keeps generated CSS compatible across supported browsers.

const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
