// postcss.config.cjs
const tailwindcss = require('@tailwindcss/postcss');

module.exports = {
  plugins: [
    require('postcss-nesting'),
    tailwindcss({ config: './tailwind.config.ts' }),
    require('autoprefixer'),
  ],
};
