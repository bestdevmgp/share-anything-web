const webpack = require('webpack');

module.exports = function override(config) {
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, '');
    })
  );

  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    'fs/promises': false,
  };

  return config;
};
