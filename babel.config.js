module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-react': {
          runtime: 'automatic',
          importSource: 'react'
        }
      }
    ]
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      regenerator: true
    }]
  ]
}; 