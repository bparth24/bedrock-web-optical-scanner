/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

export {OpticalScanner} from './lib/optical-scanner.js';
export {
  createPlugin,
  qrCodePlugin,
  pdf417Plugin,
  mrzPlugin
} from './lib/plugins/index.js';
export * as cameraUtils from './lib/utils/camera.js';

// Only run manual test logic if loaded in manual-test.html
if(typeof window !== 'undefined' && window.manualTest === true) {
  window.addEventListener('DOMContentLoaded', () => {
    // DOM elements - Existing
    const statusEl = document.getElementById('status');
    const startCameraBtn = document.getElementById('startCamera');
    const stopCameraBtn = document.getElementById('stopCamera');
    const scanCameraBtn = document.getElementById('scanCamera');
    const videoEl = document.getElementById('video');
    const cameraResultsEl = document.getElementById('cameraResults');
    const fileInput = document.getElementById('fileInput');
    const scanFileBtn = document.getElementById('scanFile');
    const fileResultsEl = document.getElementById('fileResults');
    const formatsListEl = document.getElementById('formatsList');
    const debugInfoEl = document.getElementById('debugInfo');

    // DOM elements - MRZ
    const mrzLicenseKeyInput = document.getElementById('mrzLicenseKey');
    const mrzCameraBtn = document.getElementById('mrzCameraBtn');
    const mrzCameraResultsEl = document.getElementById('mrzCameraResults');
    const mrzFileInput = document.getElementById('mrzFileInput');
    const scanMrzFileBtn = document.getElementById('scanMrzFile');
    const mrzFileResultsEl = document.getElementById('mrzFileResults');
    const mrzValidationEl = document.getElementById('mrzValidation');
    const mrzValidationContentEl = document.getElementById(
      'mrzValidationContent'
    );

    // DOM elements - Multi-format
    const scanAllFormatsBtn = document.getElementById('scanAllFormats');
    const multiFormatFileInput = document.getElementById(
      'multiFormatFileInput'
    );
    const scanMultiFormatFileBtn = document.getElementById(
      'scanMultiFormatFile'
    );
    const multiFormatResultsEl = document.getElementById(
      'multiFormatResults'
    );

    let scanner = null;
    let mrzScanner = null;
    let videoStream = null;

    /**
     * Update status display.
     *
     * @param {string} message - Status message.
     * @param {string} type - Status type: 'loading' | 'success' | 'error' |
     *   'warning'.
     */
    function updateStatus(message, type = 'loading') {
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
    }

    /**
     * Update debug info display.
     *
     * @param {object|string} info - Debug information.
     */
    function updateDebugInfo(info) {
      const debugText = typeof info === 'object' ?
        JSON.stringify(info, null, 2) :
        info;
      debugInfoEl.textContent = debugText;
    }

    /**
     * Display scan results.
     *
     * @param {object[]} results - Scan results.
     * @param {HTMLElement} targetEl - Target element for display.
     */
    function displayResults(results, targetEl) {
      targetEl.style.display = 'block';
      targetEl.textContent = JSON.stringify(results, null, 2);
    }

    /**
     * Display MRZ validation analysis.
     *
     * @param {object} validation - MRZ validation data.
     */
    function displayMRZValidation(validation) {
      if(!validation) {
        mrzValidationEl.style.display = 'none';
        return;
      }

      mrzValidationEl.style.display = 'block';

      const {overallStatus, statistics, fieldAnalysis} = validation;

      let html = `
        <div class="validation-summary">
          <p><strong>Overall Status:</strong> <span class="validation-score">
            ${overallStatus.toUpperCase()}
          </span></p>
          <p><strong>Completion:</strong> ${statistics.overallCompleteness}% 
            overall, ${statistics.criticalCompleteness}% critical fields</p>
          <p><strong>Fields:</strong> 
            ${statistics.validFields}/${statistics.totalFields} valid, 
            ${statistics.invalidFields} invalid, 
            ${statistics.missingFields} missing
          </p>
        </div>
        <details>
          <summary><strong>Field Analysis</strong></summary>
          <div style="margin-top: 10px;">
      `;

      fieldAnalysis.forEach(field => {
        const statusIcon = {
          valid: '✅',
          invalid: '❌',
          missing: '⚠️',
          optional_missing: '➖'
        }[field.status] || '❓';

        html += `<div>${statusIcon} <strong>${field.label}:</strong> ${
          field.status
        }${field.isCritical ? ' (critical)' : ''}</div>`;
      });

      html += '</div></details>';
      mrzValidationContentEl.innerHTML = html;
    }

    // Initialize the library
    updateStatus('📦 Loading optical scanner library...');

    try {
      // Create basic scanner (QR + PDF417)
      scanner = new window.OpticalScannerLib.OpticalScanner({
        plugins: [
          window.OpticalScannerLib.qrCodePlugin,
          window.OpticalScannerLib.pdf417Plugin
        ]
      });

      // Create MRZ-enabled scanner
      mrzScanner = new window.OpticalScannerLib.OpticalScanner({
        plugins: [
          window.OpticalScannerLib.qrCodePlugin,
          window.OpticalScannerLib.pdf417Plugin,
          window.OpticalScannerLib.mrzPlugin
        ]
      });

      updateStatus('✅ Scanner ready! All formats available.', 'success');
    } catch(error) {
      updateStatus(
        `❌ Failed to initialize scanner: ${error.message}`,
        'error'
      );
      updateDebugInfo(`Initialization error: ${error.stack}`);
      return;
    }

    // Get available formats
    const formats = mrzScanner.getSupportedFormats();
    formatsListEl.innerHTML = '';
    formats.forEach(format => {
      const tag = document.createElement('div');
      tag.className = 'format-tag';
      tag.textContent = format;
      formatsListEl.appendChild(tag);
    });

    updateDebugInfo({
      libraryLoaded: true,
      supportedFormats: formats,
      scannerReady: true,
      mrzAvailable: formats.includes('mrz')
    });

    // ================================================================
    // EXISTING CAMERA FUNCTIONALITY (QR + PDF417)
    // ================================================================

    /**
     * Start camera stream.
     */
    async function startCamera() {
      try {
        updateStatus('📷 Starting camera...', 'loading');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: 'environment'}
        });

        videoEl.srcObject = stream;
        videoStream = stream;
        videoEl.style.display = 'block';

        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        scanCameraBtn.disabled = false;

        updateStatus('✅ Camera active', 'success');
      } catch(error) {
        updateStatus(`❌ Camera failed: ${error.message}`, 'error');
      }
    }

    /**
     * Stop camera stream.
     */
    function stopCamera() {
      if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoEl.style.display = 'none';

        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        scanCameraBtn.disabled = true;

        updateStatus('📷 Camera stopped', 'loading');
      }
    }

    /**
     * Scan current camera frame for barcodes.
     */
    async function scanCurrentFrame() {
      if(!videoEl.srcObject) {
        return;
      }

      try {
        updateStatus('🔍 Scanning current frame...', 'loading');

        const results = await scanner.scan(videoEl, {
          formats: ['qr_code', 'pdf417'],
          mode: 'first'
        });

        displayResults(results, cameraResultsEl);

        if(results.length > 0) {
          updateStatus(`✅ Found ${results.length} barcode(s)`, 'success');
        } else {
          updateStatus('⚠️ No barcodes detected', 'warning');
        }
      } catch(error) {
        updateStatus(`❌ Scan failed: ${error.message}`, 'error');
        displayResults({error: error.message}, cameraResultsEl);
      }
    }

    // ================================================================
    // EXISTING FILE SCANNING (QR + PDF417)
    // ================================================================

    /**
     * Scan uploaded file for barcodes.
     */
    async function scanFile() {
      const file = fileInput.files[0];
      if(!file) {
        return;
      }

      try {
        updateStatus('🔍 Scanning file...', 'loading');

        const results = await scanner.scan(file, {
          formats: ['qr_code', 'pdf417'],
          mode: 'all'
        });

        displayResults(results, fileResultsEl);

        if(results.length > 0) {
          updateStatus(
            `✅ Found ${results.length} barcode(s) in file`,
            'success'
          );
        } else {
          updateStatus('⚠️ No barcodes detected in file', 'warning');
        }
      } catch(error) {
        updateStatus(`❌ File scan failed: ${error.message}`, 'error');
        displayResults({error: error.message}, fileResultsEl);
      }
    }

    // ================================================================
    // MRZ FUNCTIONALITY
    // ================================================================

    /**
     * Get and validate MRZ license key.
     *
     * @returns {string|null} License key or null if invalid.
     */
    function getMRZLicenseKey() {
      const licenseKey = mrzLicenseKeyInput.value.trim();
      if(!licenseKey) {
        updateStatus('❌ MRZ License key required', 'error');
        mrzLicenseKeyInput.focus();
        return null;
      }
      return licenseKey;
    }

    /**
     * Scan MRZ from camera.
     */
    async function scanMRZFromCamera() {
      const licenseKey = getMRZLicenseKey();
      if(!licenseKey) {
        return;
      }

      try {
        updateStatus('📷 Launching MRZ camera scanner...', 'loading');

        // Correctly structure pluginOptions by format
        const results = await mrzScanner.scan(null, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: {
            mrz: { // ← Key by format name
              licenseKey,
              mrzMode: 'camera',
              scannerConfig: {
                resultViewConfig: {
                  onDone: result => {
                    console.log('MRZ Camera scan completed:', result);
                    return result;
                  }
                }
              }
            }
          }
        });

        displayResults(results, mrzCameraResultsEl);

        if(
          results.length > 0 &&
          results[0].data &&
          results[0].data.validation
        ) {
          displayMRZValidation(results[0].data.validation);
          updateStatus(
            `✅ MRZ extracted successfully (${
              results[0].data.validation.overallStatus
            })`,
            'success'
          );
        } else if(results.length > 0) {
          updateStatus('✅ MRZ extracted', 'success');
        } else {
          updateStatus('⚠️ No MRZ detected', 'warning');
        }
      } catch(error) {
        updateStatus(
          `❌ MRZ camera scan failed: ${error.message}`,
          'error'
        );
        displayResults({error: error.message}, mrzCameraResultsEl);
      }
    }

    /**
     * Scan MRZ from uploaded file.
     */
    async function scanMRZFromFile() {
      const file = mrzFileInput.files[0];
      const licenseKey = getMRZLicenseKey();
      if(!file || !licenseKey) {
        return;
      }

      try {
        updateStatus('🔍 Scanning MRZ from file...', 'loading');

        const results = await mrzScanner.scan(file, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: {
            mrz: { // ← Key by format name
              licenseKey,
              mrzMode: 'file'
            }
          }
        });

        displayResults(results, mrzFileResultsEl);

        if(
          results.length > 0 &&
          results[0].data &&
          results[0].data.validation
        ) {
          displayMRZValidation(results[0].data.validation);
          updateStatus(
            `✅ MRZ extracted from file (${
              results[0].data.validation.overallStatus
            })`,
            'success'
          );
        } else if(results.length > 0) {
          updateStatus('✅ MRZ extracted from file', 'success');
        } else {
          updateStatus('⚠️ No MRZ detected in file', 'warning');
        }
      } catch(error) {
        updateStatus(`❌ MRZ file scan failed: ${error.message}`, 'error');
        displayResults({error: error.message}, mrzFileResultsEl);
      }
    }

    // ================================================================
    // MULTI-FORMAT FUNCTIONALITY
    // ================================================================

    /**
     * Scan all formats from camera.
     */
    async function scanAllFormatsFromCamera() {
      const licenseKey = getMRZLicenseKey();
      if(!licenseKey) {
        return;
      }

      if(!videoEl.srcObject) {
        updateStatus('❌ Start camera first', 'error');
        return;
      }

      try {
        updateStatus('🔍 Scanning all formats from camera...', 'loading');

        const results = await mrzScanner.scan(videoEl, {
          formats: ['qr_code', 'pdf417', 'mrz'],
          mode: 'all',
          pluginOptions: {
            mrz: { // ← Key by format name
              licenseKey,
              mrzMode: 'element'
            }
          }
        });

        displayResults(results, multiFormatResultsEl);

        if(results.length > 0) {
          const formatCounts = {};
          results.forEach(r => {
            formatCounts[r.format] = (formatCounts[r.format] || 0) + 1;
          });
          const summary = Object.entries(formatCounts)
            .map(([format, count]) => `${count} ${format}`)
            .join(', ');
          updateStatus(`✅ Multi-format scan: ${summary}`, 'success');
        } else {
          updateStatus('⚠️ No codes detected', 'warning');
        }
      } catch(error) {
        updateStatus(
          `❌ Multi-format scan failed: ${error.message}`,
          'error'
        );
        displayResults({error: error.message}, multiFormatResultsEl);
      }
    }

    /**
     * Scan all formats from uploaded file.
     */
    async function scanMultiFormatFile() {
      const file = multiFormatFileInput.files[0];
      const licenseKey = getMRZLicenseKey();
      if(!file || !licenseKey) {
        return;
      }

      try {
        updateStatus('🔍 Scanning file for all formats...', 'loading');

        const results = await mrzScanner.scan(file, {
          formats: ['qr_code', 'pdf417', 'mrz'],
          mode: 'all',
          pluginOptions: {
            mrz: { // ← Key by format name
              licenseKey,
              mrzMode: 'file'
            }
          }
        });

        displayResults(results, multiFormatResultsEl);

        if(results.length > 0) {
          const formatCounts = {};
          results.forEach(r => {
            formatCounts[r.format] = (formatCounts[r.format] || 0) + 1;
          });
          const summary = Object.entries(formatCounts)
            .map(([format, count]) => `${count} ${format}`)
            .join(', ');
          updateStatus(`✅ Multi-format file scan: ${summary}`, 'success');

          // Show MRZ validation if present
          const mrzResult = results.find(r => r.format === 'mrz');
          if(mrzResult && mrzResult.data && mrzResult.data.validation) {
            displayMRZValidation(mrzResult.data.validation);
          }
        } else {
          updateStatus('⚠️ No codes detected in file', 'warning');
        }
      } catch(error) {
        updateStatus(
          `❌ Multi-format file scan failed: ${error.message}`,
          'error'
        );
        displayResults({error: error.message}, multiFormatResultsEl);
      }
    }

    // ================================================================
    // EVENT LISTENERS
    // ================================================================

    // Existing functionality
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    scanCameraBtn.addEventListener('click', scanCurrentFrame);
    scanFileBtn.addEventListener('click', scanFile);

    // MRZ functionality
    mrzCameraBtn.addEventListener('click', scanMRZFromCamera);
    scanMrzFileBtn.addEventListener('click', scanMRZFromFile);

    // Multi-format functionality
    scanAllFormatsBtn.addEventListener('click', scanAllFormatsFromCamera);
    scanMultiFormatFileBtn.addEventListener('click', scanMultiFormatFile);

    // Save license key to localStorage for convenience
    mrzLicenseKeyInput.addEventListener('input', () => {
      try {
        localStorage.setItem('mrzLicenseKey', mrzLicenseKeyInput.value);
      } catch(e) {
        // Ignore localStorage errors
      }
    });

    // Load saved license key
    try {
      const savedKey = localStorage.getItem('mrzLicenseKey');
      if(savedKey) {
        mrzLicenseKeyInput.value = savedKey;
      }
    } catch(e) {
      // Ignore localStorage errors
    }

    // ================================================================
    // INITIALIZATION COMPLETE
    // ================================================================

    updateDebugInfo({
      libraryLoaded: true,
      supportedFormats: formats,
      eventListenersAttached: true,
      mrzAvailable: true,
      ready: true
    });
  });
}
