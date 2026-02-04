const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './scripts/synth-entry.js',
  output: {
    filename: 'synth-bundle.min.js', // Always use the .min.js extension since we're always minifying
    path: path.resolve(__dirname, 'public'),
    // Use library type 'window' to expose all exports directly on the window object
    library: {
      type: 'window'
    }

  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  externals: {
    'tone': 'Tone',
    'p5': 'p5',
    'socket.io-client': 'io',
    'nexusui': 'Nexus'
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.25%, not dead',
                modules: 'commonjs'
              }],
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  optimization: {
    minimize: true, // Always minify regardless of environment
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true, // Keep classes to ensure proper functionality
          keep_fnames: true,    // Keep function names for better debugging
          mangle: {
            keep_classnames: true,
            keep_fnames: true,
            reserved: []  // Add any names that should not be mangled
          },
          compress: {
            drop_console: false,  // Keep console logs for debugging
            passes: 2,            // Multiple compression passes
            dead_code: true,
            unused: true,
            sequences: true,
            conditionals: true,
            booleans: true,
            if_return: true,
            join_vars: true,
            drop_debugger: true,
            reduce_vars: true,
            collapse_vars: true,
            keep_classnames: true,
            keep_fnames: true,
            keep_infinity: true
          },
          format: {
            beautify: false,      // No pretty formatting
            comments: false,      // Remove comments
            ascii_only: true       // Use ASCII characters only
          }
        },
        extractComments: false   // Don't extract comments to a separate file
      })
    ]
  }
};
