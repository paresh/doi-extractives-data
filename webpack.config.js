// jshint node: true
var webpack = require('webpack');
var path = require('path');
var env = process.env.NODE_ENV;

var config = {

  entry: {
    'main.min': './js/src/main.js',
    'narrative.min': './js/src/narrative.js',
    'static.min': './js/src/static.js',
    'explore.min': './js/src/explore.js',
    'homepage.min': './js/src/homepage.js',
  },

  output: {
    path: path.resolve(__dirname, './js/lib'),
    filename: '[name].js',
    chunkFilename: '[id].js'
  },

  plugins: []

};

if (env === 'production') {
  var uglify = new webpack.optimize.UglifyJsPlugin({minimize: true});
  config.plugins.push(uglify);
  config.devtool = 'source-map';
}

module.exports = config;
