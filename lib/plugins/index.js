/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

export {qrCodePlugin} from './qrCodePlugin.js';
export {pdf417Plugin} from './pdf417Plugin.js';
export {mrzPlugin} from './mrzPlugin.js';

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
