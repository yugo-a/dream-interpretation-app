const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      fallback: {
        // 必要なモジュールのみを残す
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "stream": require.resolve("stream-browserify"),
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      })
    ]
  }
});
