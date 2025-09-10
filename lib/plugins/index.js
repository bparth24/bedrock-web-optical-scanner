/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

// Import everything first
import {
  calculateScanRegion,
  // createDriverLicensePlugin,
  driverLicenseFields,
  enhancedPdf417Plugin,
  parseDLInfo
} from './enhancedPdf417Plugin.js';
import {mrzPlugin} from './mrzPlugin.js';
import {pdf417Plugin} from './pdf417Plugin.js';
import {qrCodePlugin} from './qrCodePlugin.js';

// Then export everything
export {
  qrCodePlugin,
  pdf417Plugin,
  enhancedPdf417Plugin,
  mrzPlugin
  // createDriverLicensePlugin,
};

// Export utility functions
export {
  driverLicenseFields,
  parseDLInfo,
  calculateScanRegion
};

/**
 * Create a plugin with the standard interface.
 *
 * @param {string} format - Format identifier.
 * @param {Function} scanFunction - Scan function:
 *   (source, options) => Promise<results>.
 *
 * @returns {object} Plugin object.
 */
export function createPlugin(format, scanFunction) {
  return {
    format,
    scan: scanFunction
  };
}

/**
 * Default plugin configurations for common use cases.
 */

// Basic PDF417 plugin (using BarcodeDetector API)
// export const basicPdf417Plugin = pdf417Plugin;

// Enhanced PDF417 plugin with Dynamsoft (requires license)
// export const advancedPdf417Plugin = enhancedPdf417Plugin;

/**
 * Pre-configured driver license plugin factory.
 *
 * @param {string} licenseKey - Dynamsoft license key.
 * @param {object} options - Plugin configuration options.
 * @param {number} options.deblurLevel - Deblur level 1-9.
 * @param {number} options.regionScale - Region scale 0-1.
 * @param {boolean} options.fallbackEnabled - Enable fallback to
 *   BarcodeDetector.
 *
 * @returns {object} Configured driver license plugin.
 */
// export function createDLScannerPlugin(licenseKey, options = {}) {
//   const {
//     deblurLevel = 9,
//     regionScale = 0.4,
//     fallbackEnabled = true
//   } = options;

//   return {
//     format: 'driver_license',
//     scan: async (source, scanOptions = {}) => {
//       return enhancedPdf417Plugin.scan(source, {
//         ...scanOptions,
//         license: licenseKey,
//         parseDL: true,
//         useDynamsoft: true,
//         deblurLevel,
//         regionScale,
//         useRegion: true,
//         fallbackToBarcodeDetector: fallbackEnabled
//       });
//     }
//   };
// }
