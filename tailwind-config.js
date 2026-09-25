// Konfigurasi Tema Tailwind CSS Terpusat OASE Cerita
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        heather: {
          50: '#FBF5F9',
          100: '#F5EBF3',
          200: '#EBD8E7',
          300: '#DCB8D4',
          400: '#C78CBB',
          500: '#A14189', /* HEATHER MAUVE PRIMARY */
          600: '#8E3476',
          700: '#752A62',
          800: '#5F244F',
          900: '#3D1533',
        },
        oase: {
          cream: '#FDFBF7',
          surface: '#FDF7FB',
          border: '#CCA8C5',
          plum: '#240B1D',
          muted: '#553D4F'
        }
      }
    }
  }
};
