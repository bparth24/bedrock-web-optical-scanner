/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'url';
import path from 'path';
import webpack from 'webpack';
import '@bedrock/karma';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config.karma.suites['bedrock-web-optical-scanner'] =
  path.join('web', '**', '*.js');
config.karma.config.proxies = {
  '/': 'https://localhost:18443/'
};

config.karma.config.proxyValidateSSL = false;
config.karma.config.webpack.resolve = {
  modules: [
    path.resolve(__dirname, '..', 'node_modules'),
    path.resolve(__dirname, 'node_modules'),
  ]
};

// Add DefinePlugin to inject environment variables
config.karma.config.webpack.plugins = config.karma.config.webpack.plugins || [];
config.karma.config.webpack.plugins.push(
  new webpack.DefinePlugin({
    // Inject environment variables at build time
    'process.env.DYNAMSOFT_MRZ_LICENSE_KEY': JSON.stringify(
      process.env.DYNAMSOFT_MRZ_LICENSE_KEY || null
    )
  })
);

// Add test images for scanning
config.karma.config.files.push({
  pattern: 'images/qr_code/**/*.*',
  included: false,
  served: true,
  watched: false
});
config.karma.config.files.push({
  pattern: 'images/pdf417/**/*.*',
  included: false,
  served: true,
  watched: false
});
config.karma.config.files.push({
  pattern: 'images/mrz/**/*.*',
  included: false,
  served: true,
  watched: false
});
