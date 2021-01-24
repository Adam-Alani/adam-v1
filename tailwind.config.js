module.exports = {
  darkMode: 'class', // This can be 'media' if preferred.
  purge: [
    './src/**/*.svelte',
    './src/**/*.html',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        highlightblue: '#4F719E',
        bgblue: '#142339',
        darkgblue: '#494C5B',
        shdowblue: '#0B1C31',
        lgrayblue: '#A8B1C0',
        whiteblue: '#EDF2F8',
        mgblue: '#B7BFCC',

        buttonblue: '#E0E6EE',


        gradienttop: '#808896',


        JavaScript: '#FFED5D',
        Python: '#3775A8',
        Go: '#74CDDD',
        Svelte: '#ff5a2f',

      },
    },
    filter: { // defaults to {}
      'none': 'none',
      'grayscale': 'grayscale(1)',
      'invert': 'invert(1)',
      'sepia': 'sepia(1)',
    },
    backdropFilter: { // defaults to {}
      'none': 'none',
      'blur': 'blur(5px)',
    },
  },

  variants: {
    filter: ['responsive'], // defaults to ['responsive']
    backdropFilter: ['responsive'], // defaults to ['responsive']
    animate: ['hover']
  },
  plugins: [
      require('tailwindcss-filters'),
  ],
}
