const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './scripts/timing-entry.js',
  output: {
    filename: 'timing-bundle.min.js',
    path: path.resolve(__dirname, 'public'),
    library: {
      type: 'window' // Expose as global variables on window
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules[\\/](?!(timing-object|timing-provider)[\\/])/, // Only process timing libraries from node_modules
        use: {
          loader: 'babel-loader',
          options: {
            compact: true,
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.5%, last 2 versions, not dead',
                modules: false,
                loose: true
              }]
            ],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }
      }
    ]
  },
  externals: { // Exclude all other external dependencies
    'react': 'React',
    'react-dom': 'ReactDOM'
  },
  plugins: [
    // Remove all moment.js locales
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),
    // Define NODE_ENV for smaller bundle size
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  optimization: {
    minimize: true,
    sideEffects: true,
    usedExports: true,
    concatenateModules: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: false,
        terserOptions: {
          ecma: 2020,
          module: true,
          mangle: {
            reserved: ['TimingObject', 'TimingProvider'] // Preserve these global names
          },
          compress: {
            passes: 3,
            drop_console: true,
            drop_debugger: true,
            pure_getters: true,
            unsafe: true,
            toplevel: true
          },
          format: {
            comments: false
          }
        }
      })
    ]
  },
  // Don't generate source maps to reduce size further
  devtool: false
};
