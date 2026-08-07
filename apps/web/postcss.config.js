// CJS postcss config — forces CommonJS loading of the Tailwind config in both
// dev and build, eliminating the intermittent "require is not defined" crash
// that occurs when postcss runs as ESM (postcss.config.mjs) while Tailwind
// tries to `require()` the TypeScript config.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
