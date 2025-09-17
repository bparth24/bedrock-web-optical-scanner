/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import * as cameraUtils from './utils/camera.js';
import {
  enhancedPdf417Plugin,
  mrzPlugin,
  pdf417Plugin,
  qrCodePlugin
} from './plugins/index.js';
import {OpticalScanner} from './optical-scanner.js';

/**
 *
 * High-level camera scanner that provides a simple API for framework
 * integration. Handles all scanning complexities internally - frameworks
 * just handle UI.
 *
 */
export class CameraScanner {
  constructor(options = {}) {
    // Extract configuration options
    const {
      scanType = 'barcode', // 'mrz' or 'barcode'
      scanMode = 'first', // 'first', 'all', 'exhaustive'
      licenseKey = '', // Dynamsoft license key
      targetContainer = null, // DOM element for MRZ UI
      ...otherOptions
    } = options;

    // Validate scanType
    if(!['mrz', 'barcode'].includes(scanType)) {
      throw new Error('scanType must be "mrz" or "barcode"');
    }

    // Validate scanMode
    if(!['first', 'all', 'exhaustive'].includes(scanMode)) {
      throw new Error('scanMode must be "first", "all", or "exhaustive"');
    }

    // Store configuration
    this.config = {
      scanType,
      scanMode,
      licenseKey,
      targetContainer, // only for MRZ Dynamsoft native camera UI
      ...otherOptions
    };

    // Internal state - frameworks don't need to know about this
    this._stream = null;
    this._videoElement = null;
    this._opticalScanner = null;
    this._isScanning = false;

    // Initialize the low-level scanner
    this._initializeScanner();
  }

  /**
   * Initialize the underlying optical scanner with all plugins.
   *
   * @private
   */
  _initializeScanner() {
    console.log('Initializing Camera Scanner...');
    // Register all available plugins automatically
    const allPlugins = [
      qrCodePlugin,
      pdf417Plugin,
      enhancedPdf417Plugin,
      mrzPlugin
    ].filter(plugin => plugin); // Filter out any undefined plugins

    // Create the low-level scanner with all plugins
    this._opticalScanner = new OpticalScanner({
      plugins: allPlugins
    });

    // Build plugin options based on configuration
    this._pluginOptions = this._buildPluginOptions();

    // Validate that configuration is supported
    try {
      this._validateConfiguration();
      console.log('CameraScanner initialized successfully');
    } catch(error) {
      console.error('CameraScanner configuration error:', error.message);
      throw error;
    }

    console.log('CameraScanner initialized with formats:', {
      config: this.config,
      scanConfig: this.getScanConfig(),
      supportedFormats: this._opticalScanner.getSupportedFormats(),
      pluginOptions: Object.keys(this._pluginOptions)
    });
  }

  // NOTES: _buildPluginOptions could be based on scanType
  // - mrz or barcode parameter instead of if/else use switch.
  // NOT A BUG - but it can be improved. maybe use _getScanConfig()

  /**
  * Build plugin-specific options based on current configuration.
  *
  * @private
  * @returns {object} Plugin options object.
  */
  _buildPluginOptions() {
    const pluginOptions = {};

    // Only build options if license key is provided
    if(!this.config.licenseKey) {
      console.log('No license key provided - enhanced features disabled');
      return pluginOptions;
    }

    const licenseKey = this.config.licenseKey;

    // === MRZ Plugin Options ===
    if(this._opticalScanner.getSupportedFormats().includes('mrz')) {
    // Determine MRZ mode based on scan type
      const mrzMode = this.config.scanType === 'mrz' ? 'camera' : 'element';

      // Dynamsoft Native Camera UI Configuration Options
      const scannerViewConfig = {
        enableAutoCapture: true, // Manual capture
        autoCaptureSensitivity: 0.8, // Detection sensitivity
        documentDetection: true, // Focus on document detection
        stableDetectionCount: 3, // Require consistent detections
        showScanGuide: true, // Show scanning guide
        showUploadImage: true, // Allow image upload
        showFormatSelector: false, // Hide format selector
        showSoundToggle: true, // Show sound toggle
        showPoweredByDynamsoft: true // Show branding
      };

      const resultViewConfig = {
        showResult: true, // Show result screen
        enableResultVerification: true // Allow result editing
      };

      pluginOptions.mrz = {
        licenseKey,
        mrzMode,
        scannerConfig: {
          container: this.config.targetContainer || null,
          scannerViewConfig,
          resultViewConfig
        }
      };

      console.log(`MRZ plugin configured with mode: ${mrzMode}, 
        container: ${this.config.targetContainer ? 'provided' : 'default'}`);
    }

    // === Enhanced PDF417 Plugin Options ===
    if(this._opticalScanner.getSupportedFormats().includes('pdf417_enhanced')) {
      pluginOptions.pdf417_enhanced = {
        licenseKey,
        useDynamsoft: true,
        parseDL: true // Parse driver license data
      };

      console.log('Enhanced PDF417 plugin configured');
    }

    // === Future: Other enhanced plugins can be added here ===
    // Example:
    // if (this._opticalScanner.getSupportedFormats().includes('qr_enhanced')) {
    //   pluginOptions.qr_enhanced = {
    //     licenseKey,
    //     useAdvancedDecoding: true
    //   };
    // }

    console.log('Plugin options built:', pluginOptions);
    return pluginOptions;
  }

  /**
  * Check if enhanced scanning features are available.
  *
  * @returns {object} Available enhanced features.
  */
  getEnhancedFeatures() {
    const hasLicense = !!this.config.licenseKey;
    const supportedFormats = this._opticalScanner.getSupportedFormats();

    return {
      hasLicense,
      mrz: hasLicense && supportedFormats.includes('mrz'),
      enhancedPDF417: hasLicense &&
        supportedFormats.includes('pdf417_enhanced'),
      dynamsoft: hasLicense
    };
  }

  /**
  * Rebuild plugin options (called when configuration changes).
  *
  * @private
  */
  _rebuildPluginOptions() {
    this._pluginOptions = this._buildPluginOptions();
    console.log('Plugin options rebuilt due to configuration change');
  }

  /**
  * Update scanner configuration.
  *
  * @param {object} newConfig - New configuration options.
  */
  updateConfig(newConfig) {
    const oldLicenseKey = this.config.licenseKey;
    const oldScanType = this.config.scanType;

    this.config = {...this.config, ...newConfig};

    // Rebuild plugin options if license key or scan type changed
    if(newConfig.licenseKey !== oldLicenseKey ||
      newConfig.scanType !== oldScanType) {
      this._rebuildPluginOptions();
    }

    console.log('CameraScanner configuration updated:', this.config);
  }

  /**
  * Get current scan configuration with format details.
  *
  * @returns {object} Current scan configuration.
  */
  getScanConfig() {
    const config = this._getScanConfig();
    const supportedFormats = this._opticalScanner.getSupportedFormats();

    return {
      ...config,
      availableFormats: config.formats.filter(f =>
        supportedFormats.includes(f)),
      enhancedFeaturesRequired: this._requiresEnhancedFeatures(),
      valid: true // Will be set by validation
    };
  }

  /**
  * Get scan formats based on current scan type configuration.
  *
  * @private
  * @returns {object} Scan configuration with formats and settings.
  */
  _getScanConfig() {
    const {scanType} = this.config;

    switch(scanType) {
      case 'mrz':
        return {
          formats: ['mrz'],
          useContinuousScanning: false, // MRZ uses on-demand scanning
          preferredMode: 'first' // Only need one MRZ result
        };

      case 'barcode':
        return {
          formats: ['qr_code', 'pdf417_enhanced', 'pdf417'],
          // Barcodes benefit from continuous scanning
          useContinuousScanning: true,
          preferredMode: this.config.scanMode
        };

      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
  }

  /**
  * Get formats for file scanning (may differ from camera scanning).
  *
  * @private
  * @returns {string[]} Array of formats suitable for file scanning.
  */
  _getFileScanFormats() {
    const {scanType} = this.config;

    switch(scanType) {
      case 'mrz':
        // File-based MRZ scanning
        return ['mrz'];

      case 'barcode':
        // For files, include all barcode formats
        return ['qr_code', 'pdf417', 'pdf417_enhanced'];

      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
  }

  /**
  * Check if current configuration requires enhanced features.
  *
  * @private
  * @returns {boolean} True if enhanced features needed.
  */
  _requiresEnhancedFeatures() {
    const scanConfig = this._getScanConfig();

    // Check if any format requires license
    const enhancedFormats = ['mrz', 'pdf417_enhanced'];
    return scanConfig.formats.some(format => enhancedFormats.includes(format));
  }

  /**
  * Validate that required features are available for current configuration.
  *
  * @private
  * @throws {Error} If required features are not available.
  * @returns {string[]} Array of available formats.
  */
  _validateConfiguration() {
    const scanConfig = this._getScanConfig();
    const enhancedFeatures = this.getEnhancedFeatures();

    // Check if MRZ is requested but not available
    if(scanConfig.formats.includes('mrz') && !enhancedFeatures.mrz) {
      if(!this.config.licenseKey) {
        throw new Error('MRZ scanning requires a valid Dynamsoft license key');
      } else {
        throw new Error('MRZ scanning is not available' +
          '- check license key validity');
      }
    }

    // Check if enhanced PDF417 is requested but not available
    if(scanConfig.formats.includes('pdf417_enhanced') &&
      !enhancedFeatures.enhancedPDF417) {
      console.warn('Enhanced PDF417 not available, ' +
        'falling back to basic PDF417');
    }

    // Validate that at least some formats are supported
    const supportedFormats = this._opticalScanner.getSupportedFormats();
    const availableFormats =
      scanConfig.formats.filter(f => supportedFormats.includes(f));

    if(availableFormats.length === 0) {
      throw new Error(`No supported formats available for scan type: 
        ${this.config.scanType}`);
    }

    console.log(`Configuration validated - available formats:
      ${availableFormats.join(', ')}`);
    return availableFormats;
  }

  /**
  * Get current scanner configuration.
  *
  * @returns {object} Current configuration.
  */
  getConfig() {
    return {...this.config};
  }

  /**
  * Start camera and handle all container management internally.
  *
  * IMPLEMENTATION:
  * - Accepts container from framework (Vue, React, etc.)
  * - Handles all scanning complexity internally
  * - Manages video element creation and insertion
  * - Handles MRZ native UI vs custom video display
  * - Updates plugin configurations automatically
  * - Returns when ready for scanning.
  *
  * This method moves ALL business logic from framework components into
  * the bedrock-web-optical-scanner module, keeping frameworks focused
  * purely on UI concerns.
  *
  * @param {HTMLElement} container - DOM container element for camera display.
  * @returns {Promise<object>} Status object indicating ready state.
  */
  async start(container) {
    console.log('=== ENHANCED CAMERA SCANNER START ===');
    console.log('Container provided:', !!container);
    console.log('Scan type:', this.config.scanType);
    console.log('Current configuration:', this.config);

    // === VALIDATION ===
    if(!container) {
      throw new Error('Container element is required for' +
        ' CameraScanner.start()');
    }

    if(!(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid DOM element');
    }

    // Return existing setup if already started
    if(this._stream && this._videoElement) {
      console.log('Camera already started, returning existing setup');
      return {
        success: true,
        videoReady: true,
        scanType: this.config.scanType,
        message: 'Camera already active'
      };
    }

    try {
      // === STEP 1: CREATE VIDEO ELEMENT ===
      // Use existing camera utilities to create video element with stream
      console.log('Step 1: Creating video element and camera stream...');

      const constraints = cameraUtils.getDefaultConstraints();
      console.log('Camera constraints:', constraints);

      // Request camera access and create stream
      this._stream = await cameraUtils.startCameraStream(constraints);

      // Create video element with proper configuration
      this._videoElement = await Promise.race([
        cameraUtils.createVideoElement(this._stream, {
          autoplay: true,
          muted: true,
          playsInline: true
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Video load timeout')), 10000)
        )
      ]);

      console.log('Video element created successfully:', {
        width: this._videoElement.videoWidth,
        height: this._videoElement.videoHeight,
        readyState: this._videoElement.readyState,
        srcObject: !!this._videoElement.srcObject
      });

      // === STEP 2: ANALYZE SCAN TYPE AND MODE ===
      // Determine container strategy based on scan type
      // and plugin configuration
      console.log('Step 2: Analyzing scan type and mode configuration...');

      const scanConfig = this._getScanConfig();
      console.log('Scan configuration:', scanConfig);

      let containerStrategy = 'video_insertion'; // Default strategy
      let mrzPluginMode = null;

      if(this.config.scanType === 'mrz') {
        // === MRZ MODE ANALYSIS ===
        console.log('=== MRZ MODE DETECTED ===');

        const mrzPluginOptions = this._pluginOptions?.mrz;
        console.log('MRZ plugin options:', mrzPluginOptions);

        if(mrzPluginOptions) {
          mrzPluginMode = mrzPluginOptions.mrzMode;
          console.log('MRZ plugin mode:', mrzPluginMode);

          if(mrzPluginMode === 'camera') {
            // === MRZ CAMERA MODE - DYNAMSOFT NATIVE UI ===
            containerStrategy = 'dynamsoft_native';
            console.log('MRZ CAMERA MODE: Will use Dynamsoft native UI');
            console.log('Container will be managed by Dynamsoft');
            console.log('Will NOT insert video element');
          } else {
            // === MRZ ELEMENT MODE - CUSTOM UI ===
            containerStrategy = 'video_insertion';
            console.log('MRZ ELEMENT MODE: Will insert video element');
            console.log('Custom UI with video element');
          }
        } else {
          console.warn('MRZ plugin options not found,' +
            'falling back to video insertion');
          containerStrategy = 'video_insertion';
        }
      } else {
        // === BARCODE MODE ===
        console.log('=== BARCODE MODE DETECTED ===');
        containerStrategy = 'video_insertion';
        console.log('BARCODE MODE: Will insert video element with overlays');
      }

      console.log('=== CONTAINER STRATEGY DECISION ===');
      console.log('Strategy:', containerStrategy);
      console.log('MRZ mode:', mrzPluginMode || 'N/A');

      // === STEP 3: CONTAINER MANAGEMENT ===
      // Handle container based on determined strategy
      console.log('Step 3: Managing container based on strategy...');

      // Clear any existing content in container
      console.log('Clearing container content...');
      container.innerHTML = '';
      console.log('Container cleared');

      if(containerStrategy === 'video_insertion') {
        // === VIDEO INSERTION STRATEGY ===
        // Insert video element for barcode mode or MRZ element mode
        console.log('EXECUTING VIDEO INSERTION STRATEGY');

        // Style video element for proper container fit
        this._videoElement.style.width = '100%';
        this._videoElement.style.height = '100%';
        this._videoElement.style.objectFit = 'cover';

        // Insert video element into container
        container.appendChild(this._videoElement);

        console.log('Video element inserted into container');
        console.log('Container children count:', container.children.length);
        console.log('Video element parent:',
          this._videoElement.parentElement === container);

      } else if(containerStrategy === 'dynamsoft_native') {
        // === DYNAMSOFT NATIVE UI STRATEGY ===
        // Leave container empty for Dynamsoft to populate
        console.log('EXECUTING DYNAMSOFT NATIVE STRATEGY');
        console.log('Container prepared for Dynamsoft native UI');
        console.log('Video element NOT inserted - Dynamsoft will manage');

        // === UPDATE MRZ PLUGIN CONTAINER REFERENCE ===
        // Update plugin options to reference the provided container
        console.log('=== UPDATING MRZ PLUGIN CONTAINER REFERENCE ===');

        if(this._pluginOptions?.mrz?.scannerConfig) {
          const originalContainer = this._pluginOptions.mrz
            .scannerConfig.container;
          console.log('Original MRZ container reference:', originalContainer);

          // Update container reference for Dynamsoft
          this._pluginOptions.mrz.scannerConfig.container = container;

          const updatedContainer = this._pluginOptions.mrz
            .scannerConfig.container;
          console.log('Updated MRZ container reference:', updatedContainer);
          console.log('Container update successful:',
            updatedContainer === container);

          console.log('=== FINAL MRZ PLUGIN CONFIGURATION ===');
          console.log('Complete MRZ config:', JSON.stringify({
            mrzMode: this._pluginOptions.mrz.mrzMode,
            licenseKey: this._pluginOptions.mrz.licenseKey ?
              'PROVIDED' : 'MISSING',
            scannerConfig: {
              container: 'DOM_ELEMENT_REFERENCE',
              scannerViewConfig: this._pluginOptions.mrz
                .scannerConfig.scannerViewConfig,
              resultViewConfig: this._pluginOptions.mrz
                .scannerConfig.resultViewConfig
            }
          }, null, 2));

        } else {
          console.error('MRZ plugin scannerConfig not found -' +
            ' cannot update container');
          throw new Error('MRZ plugin configuration invalid -' +
            ' missing scannerConfig');
        }
      }

      // === STEP 4: VERIFY SETUP ===
      // Validate that everything is configured correctly
      console.log('Step 4: Verifying setup...');

      const setupStatus = {
        stream: !!this._stream,
        video: !!this._videoElement,
        videoReady: this._videoElement.readyState >= 2,
        /* eslint-disable */
        videoSize: `${this._videoElement.videoWidth}x${this._videoElement.videoHeight}`,
        containerStrategy,
        containerChildren: container.children.length,
        pluginsConfigured: Object.keys(this._pluginOptions).length
      };

      console.log('Setup status:', setupStatus);

      // === STEP 5: RETURN SUCCESS STATUS ===
      console.log('CameraScanner.start() completed successfully');
      console.log('=== END ENHANCED CAMERA SCANNER START ===');

      return {
        success: true,
        videoReady: setupStatus.videoReady,
        scanType: this.config.scanType,
        strategy: containerStrategy,
        mrzMode: mrzPluginMode,
        message: `Camera ready for ${this.config.scanType} scanning`,
        debug: setupStatus
      };

    } catch(error) {
      // === ERROR HANDLING ===
      console.error('CameraScanner.start() failed:', error);

      // Clean up on failure
      this.stop();

      // Provide specific error messages
      let userMessage = 'Failed to start camera';
      let errorCode = 'CAMERA_START_ERROR';

      if(error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access and try again.';
        errorCode = 'CAMERA_PERMISSION_DENIED';
      } else if(error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
        errorCode = 'NO_CAMERA_FOUND';
      } else if(error.message.includes('timeout')) {
        userMessage = 'Camera initialization timed out. Please try again.';
        errorCode = 'CAMERA_TIMEOUT';
      } else if(error.message.includes('Container')) {
        userMessage = 'Invalid container provided for camera display.';
        errorCode = 'INVALID_CONTAINER';
      }

      return {
        success: false,
        scanType: this.config.scanType,
        error: userMessage,
        code: errorCode,
        details: error.message
      };
    }
  }

  /**
 * Perform a single scan using current configuration.
 *
 * @param {object} options - Optional scan options.
 * @param {string[]} options.formats - Override formats (optional)
 *  - Array of format strings like ['qr_code', 'pdf417', 'mrz'].
 * @param {string} options.mode - Override scan mode (optional)
 *  - 'first', 'all', or 'exhaustive'.
 * @param {number} options.timeoutMs - Override timeout in ms (optional)
 *  - Custom timeout, overrides format-specific defaults.
 * @param {AbortSignal} options.signal - Abort signal for cancellation
 *  (optional) - Standard AbortController signal.
 * @param {object} options.pluginOptions - Override plugin-specific options
 *  (optional) - Custom plugin configurations.
 *
 * @returns {Promise<object>} Scan result with success/error information.
 */
  async scanOnce(options = {}) {

    /**
    * Initial Validation & State Check.
    *
    * Ensures camera is ready and prevents multiple simultaneous scans.
    */
    if(!this._videoElement || !this._stream) {
      throw new Error('Camera not started. Call start() first.');
    }

    // Prevent multiple simultaneous scans
    if(this._isScanning) {
      throw new Error('Scan already in progress.' +
        'Wait for current scan to complete.');
    }

    let scanStartTime;
    let scanSucceeded = false;
    let scanTimeout;

    try {
    /**
     * CONFIGURATION SETUP.
     *
     * Sets scanning flag.
     * Gets format configuration for example:
     *   MRZ > ['mrz'],
     *   barcode > ['qr_code', 'pdf417_enhanced', 'pdf417'].
     * Allows method-level overrides.
     * Validates formats are actually supported.
     */
      this._isScanning = true;

      // Get scan configuration (formats, mode, etc.)
      const scanConfig = this._getScanConfig();

      // Allow method-level overrides
      const formats = options.formats || scanConfig.formats;
      const mode = options.mode || scanConfig.preferredMode;

      // Validate that we have available formats
      const availableFormats = this._validateConfiguration();
      const finalFormats = formats.filter(f => availableFormats.includes(f));

      if(finalFormats.length === 0) {
        throw new Error('No supported formats available for scanning');
      }

      /**
      * TIMEOUT CONFIGURATION.
      *
      * Gets format-specific timeouts:
      *  MRZ camera: 0ms, MRZ element: 30s,
      *  PDF417 enhanced: 20s, standard: 10s.
      * Allows timeout overrides.
      * Sets up timing variables.
      */
      // Get timeout configuration based on formats
      const timeoutConfig = this._getTimeoutConfig(finalFormats);
      const timeoutMs = options.timeoutMs !== undefined ?
        options.timeoutMs : timeoutConfig.scanTimeout;
      const minScanTime = timeoutConfig.minScanTime;

      console.log(`Starting single scan - Type: ${this.config.scanType},
        Formats: ${finalFormats.join(', ')}, Mode: ${mode}`);
      console.log(`Timeout config: ${timeoutConfig.description},
        timeout: ${timeoutMs}ms, minTime: ${minScanTime}ms`);

      // Track scan timing
      scanStartTime = Date.now();

      /**
      * MRZ Camera Mode Special Case.
      *
      * For MRZ camera mode, launches Dynamsoft's native UI
      * (user-driven, no timeout needed).
      * (camera mode vs element mode).
      */

      if(this.config.scanType === 'mrz' &&
        this._pluginOptions.mrz?.mrzMode === 'camera') {
        console.log('Using MRZ camera mode - launching Dynamsoft native UI');

        // For MRZ camera mode, no timeout needed (user-driven)
        const results = await this._opticalScanner.scan(this._videoElement, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: this._pluginOptions
        });

        return this._formatScanResult(results, 'mrz');
      }

      /**
      * Standard Scanning with Timeout Logic.
      *
      * Creates scan promise.
      * If timeout > 0, creates timeout promise.
      * Races them (first to complete wins).
      */

      // Standard scanning for barcodes and MRZ element mode
      // FIXME/NOT TESTED MRZ in element mode

      const scanPromise = this._opticalScanner.scan(this._videoElement, {
        formats: finalFormats,
        mode,
        pluginOptions: this._pluginOptions
      });

      // Create timeout promise only if timeout > 0
      const promises = [scanPromise];
      if(timeoutMs > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          scanTimeout = setTimeout(() => {
            reject(new Error('SCAN_TIMEOUT'));
          }, timeoutMs);
        });
        promises.push(timeoutPromise);
      }

      // Wait for either scan completion or timeout
      const results = await Promise.race(promises);

      // Mark success IMMEDIATELY after getting results (before minimum time)
      if(results && results.length > 0) {
        scanSucceeded = true;
      }

      // Clear timeout (always clean up)
      if(scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }

      /**
      * Minimum Scan Time Enforcement.
      *
      * Ensures UI doesn't feel "too fast"
      * - minimum 1.5s scan time for better UX (except MRZ).
      */

      const needsMinTime = !finalFormats.includes('mrz') && minScanTime > 0;
      if(needsMinTime) {
        const elapsedTime = Date.now() - scanStartTime;
        if(elapsedTime < minScanTime) {
          console.log(`Enforcing minimum scan time: 
            ${minScanTime - elapsedTime}ms remaining`);
          await new Promise(resolve =>
            setTimeout(resolve, minScanTime - elapsedTime)
          );
        }
      }

      /**
      * Result Processing.
      *
      * Formats successful results or returns "no results" error.
      */
      if(scanSucceeded) {
        const result = results[0];
        console.log(`Scan successful: ${result.format} found`);
        return this._formatScanResult(results, result.format);
      } else {
      // No results found
        return {
          success: false,
          scanType: this.config.scanType,
          error: 'No optical codes detected in current frame'
        };
      }

    } catch(error) {

      /**
      * Error Handling.
      *
      * Handles timeout errors specifically, cleans up timeout,
      * provides user-friendly messages.
      * Includes abort logic for race conditions.
      */
      // Clean up timeout on any error
      if(scanTimeout) {
        clearTimeout(scanTimeout);
      }

      // Ignore AbortError after successful scan (cleanup artifact)
      if(error.name === 'AbortError' && scanSucceeded) {
        console.log('Ignoring abort error after successful scan' +
          '(cleanup race condition)');
        return {
          success: true,
          scanType: this.config.scanType,
          message: 'Scan completed successfully despite cleanup abort'
        };
      }

      // Handle specific error types
      if(error.message === 'SCAN_TIMEOUT') {
        const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);
        return {
          success: false,
          scanType: this.config.scanType,
          error: `Scan timed out after ${elapsed}s` +
            `- try repositioning or better lighting`,
          code: 'SCAN_TIMEOUT'
        };
      }

      // Handle other errors
      console.error('Scan error:', error);
      return {
        success: false,
        scanType: this.config.scanType,
        error: error.message || 'Scan failed',
        code: 'SCAN_ERROR'
      };

    } finally {
      this._isScanning = false;
    }
  }

  /**
 * Scan continuously until result found or cancelled.
 *
 * @param {object} options - Scanning options.
 * @param {AbortSignal} options.signal - Signal to cancel scanning (optional)
    - Standard AbortController signal to stop continuous scanning.
 * @param {number} options.interval - Time between scans in ms (optional)
    - Default: 2500ms, matches Vue component behavior.
 * @param {string[]} options.formats - Override formats (optional)
    - Array of format strings, defaults to scan type configuration.
 * @param {string} options.mode - Override scan mode (optional)
    - 'first', 'all', or 'exhaustive'.
 * @param {number} options.maxAttempts - Maximum scan attempts (optional)
    - Default: unlimited.
 * @param {object} options.pluginOptions - Override plugin-specific options
    (optional) - Custom plugin configurations.
 * @returns {Promise<object>} Scan result when found or error/cancellation.
 */
  async scanContinuous(options = {}) {

    /**
    * Initial Validation & State Check.
    *
    * Ensures camera is ready and prevents multiple simultaneous scans.
    * Similar to scanOnce but for continuous operation.
    */
    if(!this._videoElement || !this._stream) {
      throw new Error('Camera not started. Call start() first.');
    }

    // Prevent multiple simultaneous scans
    if(this._isScanning) {
      /* eslint-disable */
      throw new Error('Scan already in progress. Wait for current scan to complete.');
    }

    const {signal} = options;
    let scanStartTime;
    let scanSucceeded = false;
    let attempt = 0;

    try {
      /**
      * CONFIGURATION SETUP.
      *
      * Gets scan configuration and validates continuous scanning is appropriate.
      * Sets up format arrays and scanning parameters.
      * Allows method-level overrides for all configurations.
      */
      this._isScanning = true;

      // Get scan configuration
      const scanConfig = this._getScanConfig();

      // Check if continuous scanning is appropriate for this scan type
      if(!scanConfig.useContinuousScanning) {
        /* eslint-disable */
        console.warn(`Continuous scanning not recommended for ${this.config.scanType}, using single scan instead`);
        return this.scanOnce(options);
      }

      // Allow method-level overrides
      const formats = options.formats || scanConfig.formats;
      const mode = options.mode || scanConfig.preferredMode;
      const maxAttempts = options.maxAttempts || null; // Unlimited by default

      // Validate formats
      const availableFormats = this._validateConfiguration();
      const finalFormats = formats.filter(f => availableFormats.includes(f));

      if(finalFormats.length === 0) {
        throw new Error('No supported formats available for scanning');
      }

      /**
      * CONTINUOUS SCAN CONFIGURATION.
      *
      * Gets continuous scanning configuration:
      *  - Interval: 2500ms between attempts (matches Vue component)
      *  - Maximum attempts: unlimited by default
      *  - Individual scan timeout: reduced for continuous mode.
      */

      const continuousConfig = this._getContinuousConfig();
      const interval = options.interval !== undefined ?
        options.interval : continuousConfig.interval;

      /* eslint-disable */
      console.log(`Starting continuous scan - Type: ${this.config.scanType}, Formats: ${finalFormats.join(', ')}, Interval: ${interval}ms`);
      console.log(`Max attempts: ${maxAttempts || 'unlimited'}, Mode: ${mode}`);

      // Track timing
      scanStartTime = Date.now();

      // Check if already cancelled before starting
      signal?.throwIfAborted();

      /**
      * OPTICAL SCANNER CONTINUOUS METHOD CHECK.
      *
      * First tries to use the low-level scanner's built-in
      * scanContinuous method.
      * If available, delegates to that implementation.
      * Otherwise, falls back to our own scanning loop implementation.
      */

      if(this._opticalScanner.scanContinuous) {
        console.log('Using OpticalScanner.scanContinuous method');

        const results = await this._opticalScanner
          .scanContinuous(this._videoElement, {
            formats: finalFormats,
            mode,
            signal,
            pluginOptions: this._pluginOptions
          });

        if(results && results.length > 0) {
          scanSucceeded = true;
          const result = results[0];
          console.log(`Continuous scan successful: ${result.format} found`);
          return this._formatScanResult(results, result.format);
        }
      } else {

        /**
        * FALLBACK CONTINUOUS SCANNING LOOP.
        *
        * Implements our own scanning loop with proper intervals.
        * Features:
        *  - Configurable interval between attempts (default: 2500ms)
        *  - Reduced individual scan timeout for continuous mode
        *  - Attempt counting and optional max attempts limit
        *  - Proper cancellation handling during waits
        *  - Logging every 10th attempt to avoid console spam.
        */
        /* eslint-disable */
        console.log(`Using fallback continuous scanning loop with ${interval}ms intervals`);

        while(true) {
          attempt++;

          // Check for cancellation before each attempt
          signal?.throwIfAborted();

          // Check max attempts limit
          if(maxAttempts && attempt > maxAttempts) {
            return {
              success: false,
              scanType: this.config.scanType,
              error: `Max attempts reached (${maxAttempts})`,
              code: 'MAX_ATTEMPTS_REACHED',
              attempts: attempt - 1
            };
          }
          /* eslint-disable */
          console.log(`Scan attempt #${attempt}, video size: ${this._videoElement?.videoWidth}x${this._videoElement?.videoHeight}`);

          try {
            /**
            * INDIVIDUAL SCAN ATTEMPT.
            *
            * Performs single scan with reduced timeout for continuous mode.
            * Individual timeout is limited to prevent long
            * waits in continuous mode.
            * Uses 80% of interval or max 5 seconds, whichever is smaller.
            */

            // Individual scan with reduced timeout for continuous mode
            // Max 5 seconds per attempt
            const individualTimeout = Math.min(interval * 0.8, 5000);

            const results = await this._opticalScanner
              .scan(this._videoElement, {
                formats: finalFormats,
                mode,
                signal,
                pluginOptions: this._pluginOptions
              // Note: Individual timeout would be handled by the scanner itself
              });

            if(results && results.length > 0) {
              scanSucceeded = true;
              const result = results[0];
              const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);
              /* eslint-disable */
              console.log(`Continuous scan successful: ${result.format} found on attempt #${attempt} after ${elapsed}s`);
              return this._formatScanResult(results, result.format);
            }

          } catch(scanError) {
          // Individual scan failed, but continue trying unless cancelled
            if(scanError.name === 'AbortError') {
              throw scanError; // Re-throw abort errors
            }

            // Log errors periodically (don't spam console)
            if(attempt % 10 === 0) {
              console.debug(`Scan attempts 1-${attempt}:
                ${scanError.message}, continuing...`);
            }
          }

          /**
          * INTERVAL WAIT WITH CANCELLATION SUPPORT.
          *
          * Waits for the specified interval before next attempt.
          * Properly handles cancellation during the wait period.
          * Cleans up timeout and event listeners on completion.
          */
          // Wait before next scan attempt (2500ms default)
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, interval);

            // Handle cancellation during wait
            if(signal) {
              const onAbort = () => {
                clearTimeout(timeoutId);
                reject(new Error('Scan cancelled during interval wait'));
              };

              // Check if already aborted
              if(signal.aborted) {
                clearTimeout(timeoutId);
                reject(new Error('Scan cancelled during interval wait'));
                return;
              }

              // Listen for abort during wait
              signal.addEventListener('abort', onAbort, {once: true});

              // Clean up listener when timeout completes normally
              setTimeout(() => {
                signal.removeEventListener('abort', onAbort);
              }, interval);
            }
          });
        }
      }

    } catch(error) {
    /**
     * ERROR HANDLING WITH ABORT LOGIC.
     *
     * Handles various error conditions:
     *  - Abort after successful scan (race condition)
     *  - Cancellation during scanning or waiting
     *  - Individual scan failures
     *  - Configuration errors
     * Provides detailed error information and attempt counts.
     */
      console.error('Continuous scan error:', error);

      // ABORT LOGIC - Handle abort after successful scan (race condition)
      if(error.name === 'AbortError' && scanSucceeded) {
        console.log('Ignoring abort error after successful continuous scan' +
          '(cleanup race condition)');
        return {
          success: true,
          scanType: this.config.scanType,
          /* eslint-disable */
          message: 'Continuous scan completed successfully despite cleanup abort',
          attempts: attempt
        };
      }

      // Handle cancellation gracefully
      if(error.name === 'AbortError' || error.message.includes('cancelled')) {
        const elapsed = scanStartTime ? ((Date.now() - scanStartTime) / 1000)
          .toFixed(1) : '0';
        return {
          success: false,
          cancelled: true,
          scanType: this.config.scanType,
          error: 'Continuous scan cancelled',
          attempts: attempt,
          duration: `${elapsed}s`
        };
      }

      // Handle other errors
      const elapsed = scanStartTime ? ((Date.now() - scanStartTime) / 1000)
        .toFixed(1) : '0';
      return {
        success: false,
        scanType: this.config.scanType,
        error: error.message || 'Continuous scan failed',
        code: 'CONTINUOUS_SCAN_ERROR',
        attempts: attempt,
        duration: `${elapsed}s`
      };

    } finally {
      this._isScanning = false;
    }
  }

  /**
  * Format scan results into consistent output format.
  *
  * @private
  * @param {object[]} results - Raw scanner results.
  * @param {string} detectedFormat - The format that was detected.
  * @returns {object} Formatted result.
  */
  _formatScanResult(results, detectedFormat) {
    if(!results || results.length === 0) {
      return {
        success: false,
        scanType: this.config.scanType,
        error: 'No results to format'
      };
    }

    const result = results[0];

    // Format mapping for backwards compatibility
    const FORMAT_TO_HTML5QRCODE_MAP = {
      qr_code: 'QR_CODE',
      pdf417: 'PDF_417',
      pdf417_enhanced: 'PDF_417',
      mrz: 'MRZ'
    };

    return {
      success: true,
      scanType: this.config.scanType,
      format: detectedFormat,
      type: FORMAT_TO_HTML5QRCODE_MAP[detectedFormat] || detectedFormat,
      text: result.data[0]?.text || result.data,
      rawData: result.data,
      // Additional metadata
      confidence: result.confidence,
      boundingBox: result.boundingBox,
      timestamp: new Date().toISOString()
    };
  }

  /**
  * Clean up camera and scanning resources.
  */
  stop() {
    // Stop any ongoing scanning
    this._isScanning = false;

    // Stop camera stream
    if(this._stream) {
      this._stream.getTracks().forEach(track => track.stop());
      this._stream = null;
    }

    // Clean up video element
    if(this._videoElement) {
      this._videoElement.srcObject = null;
      this._videoElement = null;
    }

    console.log('CameraScanner stopped and cleaned up');
  }

  /**
  * Get timeout configuration based on scan type and formats.
  *
  * @private
  * @param {string[]} formats - Formats being scanned.
  * @returns {object} Timeout configuration.
  */
  _getTimeoutConfig(formats) {
    // Format-specific timeout logic
    if(formats.includes('mrz')) {
      const isMrzCameraMode = this._pluginOptions?.mrz?.mrzMode === 'camera';
      if(isMrzCameraMode) {
        return {
          scanTimeout: 0, // No timeout for camera mode
          minScanTime: 0, // No minimum time for MRZ
          description: 'MRZ camera mode (user-driven)'
        };
      } else {
        return {
          scanTimeout: 30000, // 30 seconds for element mode
          minScanTime: 1500, // 1.5 seconds minimum
          description: 'MRZ element mode'
        };
      }
    } else if(formats.includes('pdf417_enhanced')) {
      return {
        scanTimeout: 20000, // 20 seconds for enhanced PDF417
        minScanTime: 1500, // 1.5 seconds minimum
        description: 'Enhanced PDF417'
      };
    } else {
    // QR/basic PDF417
      return {
        scanTimeout: 10000, // 10 seconds for standard formats
        minScanTime: 1500, // 1.5 seconds minimum
        description: 'Standard barcode scanning'
      };
    }
  }

  /**
  * Get continuous scanning configuration.
  *
  * @private
  * @returns {object} Continuous scan configuration.
  */
  _getContinuousConfig() {
    return {
      interval: 2500, // 2.5 seconds between attempts (matches Vue)
      maxAttempts: null, // No limit on attempts
      description: 'Continuous scanning with 2.5s intervals'
    };
  }

  // ================================================================================
  // SCAN FILE/FILE UPLOAD METHODS - NOT TESTED Sep 15, 2025
  // ================================================================================

  /**
  * Scan a file for optical codes using current configuration.
  * 
  * @param {File|File[]} files - File(s) to scan - Single File object or array of Files to process
  * @param {object} options - Optional scan options
  * @param {string[]} options.formats - Override formats (optional) - Array of format strings, defaults to scan type configuration
  * @param {string} options.mode - Override scan mode (optional) - 'first', 'all', or 'exhaustive'
  * @param {number} options.timeoutMs - Override timeout in milliseconds (optional) - Custom timeout per file, overrides format-specific defaults
  * @param {AbortSignal} options.signal - Abort signal for cancellation (optional) - Standard AbortController signal to stop file processing
  * @param {object} options.pluginOptions - Override plugin-specific options (optional) - Custom plugin configurations
  * @param {boolean} options.processAll - Process all files vs stop on first success (optional) - Default: false (stop on first success)
  * @returns {Promise<object|object[]>} Scan result(s) - Single result object or array if processAll=true
  */
  async scanFile(files, options = {}) {

    /**
    * Initial Validation & File Processing Setup
    * 
    * Validates input files and converts to array format.
    * Ensures scanner is properly initialized.
    * Sets up processing configuration.
    */
    if(!files) {
      throw new Error('No files provided for scanning');
    }

    if(!this._opticalScanner) {
      throw new Error('Scanner not initialized. Create CameraScanner instance first.');
    }

    // Convert single file to array for consistent processing
    const fileArray = Array.isArray(files) ? files : [files];
    
    if(fileArray.length === 0) {
      throw new Error('No files provided for scanning');
    }

    // Validate file types (basic check)
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    const invalidFiles = fileArray.filter(file => 
      !supportedTypes.some(type => file.type.toLowerCase().includes(type.split('/')[1]))
    );
    
    if(invalidFiles.length > 0) {
      throw new Error(`Unsupported file types: ${invalidFiles.map(f => f.name).join(', ')}`);
    }

    const {signal, processAll = false} = options;
    let scanStartTime;
    let scanSucceeded = false;
    let processedFiles = 0;
    let allResults = [];

    try {
      /**
      * CONFIGURATION SETUP FOR FILE SCANNING
      * 
      * Gets format configuration optimized for file scanning.
      * File scanning uses different format preferences than camera scanning.
      * Sets up plugin options with file-specific configurations (especially MRZ mode).
      */
      // Get scan configuration
      const scanConfig = this._getScanConfig();
      
      // Allow method-level overrides
      const formats = options.formats || this._getFileScanFormats(); // Use file-specific formats
      const mode = options.mode || scanConfig.preferredMode;
      
      // Validate formats
      const availableFormats = this._validateConfiguration();
      const finalFormats = formats.filter(f => availableFormats.includes(f));
      
      if(finalFormats.length === 0) {
        throw new Error('No supported formats available for file scanning');
      }

      /**
      * FILE-SPECIFIC PLUGIN OPTIONS
      * 
      * Builds plugin options optimized for file scanning.
      * Key difference: MRZ uses 'file' mode instead of 'camera' mode.
      * Enhanced PDF417 and other plugins use same configuration as camera scanning.
      */
      // Build file-specific plugin options
      const filePluginOptions = this._buildFilePluginOptions();

      /**
      * FILE SCANNING TIMEOUT CONFIGURATION
      * 
      * File scanning typically needs longer timeouts than camera scanning.
      * Different timeout strategy:
      *  - MRZ file: 60s (complex processing)
      *  - Enhanced PDF417 file: 30s (driver license parsing)
      *  - Standard formats: 20s (image processing)
      */
      // Get timeout for file scanning (different from camera scanning)
      const fileTimeoutConfig = this._getFileTimeoutConfig(finalFormats);
      const timeoutMs = options.timeoutMs !== undefined ? 
        options.timeoutMs : fileTimeoutConfig.scanTimeout;

      console.log(`Starting file scan - Files: ${fileArray.length}, Type: ${this.config.scanType}, Formats: ${finalFormats.join(', ')}`);
      console.log(`File timeout config: ${fileTimeoutConfig.description}, timeout: ${timeoutMs}ms per file`);

      // Track timing
      scanStartTime = Date.now();

      // Check if already cancelled
      signal?.throwIfAborted();

      /**
      * FILE PROCESSING LOOP
      * 
      * Processes each file sequentially or until first success.
      * Features:
      *  - Individual timeout per file
      *  - Abort signal checking between files
      *  - Progress tracking and logging
      *  - Choice between first-success or process-all modes
      */
      for(const file of fileArray) {
        processedFiles++;
        
        // Check for cancellation before each file
        signal?.throwIfAborted();

        console.log(`Processing file ${processedFiles}/${fileArray.length}: ${file.name} (${file.size} bytes, ${file.type})`);

        try {
          /**
          * INDIVIDUAL FILE SCANNING
          * 
          * Scans single file with timeout protection.
          * Uses file-optimized plugin options and timeout values.
          * Handles file-specific error conditions.
          */
          let fileTimeout;
          let fileResults;

          try {
            // Create scan promise for this file
            const fileScanPromise = this._opticalScanner.scan(file, {
              formats: finalFormats,
              mode,
              signal,
              pluginOptions: filePluginOptions
            });

            // Create timeout promise if timeout > 0
            const promises = [fileScanPromise];
            if(timeoutMs > 0) {
              const timeoutPromise = new Promise((_, reject) => {
                fileTimeout = setTimeout(() => {
                  reject(new Error('FILE_SCAN_TIMEOUT'));
                }, timeoutMs);
              });
              promises.push(timeoutPromise);
            }

            // Wait for scan or timeout
            fileResults = await Promise.race(promises);

            // Clear timeout on success
            if(fileTimeout) {
              clearTimeout(fileTimeout);
              fileTimeout = null;
            }

          } catch(error) {
            // Clear timeout on error
            if(fileTimeout) {
              clearTimeout(fileTimeout);
            }
            throw error;
          }

          /**
          * FILE RESULT PROCESSING
          * 
          * Processes successful scan results from file.
          * Formats results consistently with camera scanning.
          * Handles different processing modes (first-success vs process-all).
          */
          if(fileResults && fileResults.length > 0) {
            scanSucceeded = true;
            const result = fileResults[0];
            const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);
            
            console.log(`File scan successful: ${result.format} found in ${file.name} after ${elapsed}s`);
            
            // Format the result
            const formattedResult = this._formatScanResult(fileResults, result.format);
            
            // Add file metadata
            const enrichedResult = {
              ...formattedResult,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                processedIndex: processedFiles
              },
              processingTime: elapsed + 's'
            };

            // Handle different processing modes
            if(processAll) {
              // Process all files mode - collect all results
              allResults.push(enrichedResult);
              console.log(`File ${processedFiles} processed successfully, continuing with remaining files...`);
            } else {
              // First success mode - return immediately
              console.log('Returning first successful result from file scanning');
              return enrichedResult;
            }
          } else {
            // No results in this file
            console.log(`No optical codes found in ${file.name}`);
            
            if(processAll) {
              // Add "no results" entry for this file
              allResults.push({
                success: false,
                scanType: this.config.scanType,
                error: 'No optical codes detected in file',
                file: {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  processedIndex: processedFiles
                }
              });
            }
          }

        } catch(error) {
          console.error(`Error scanning file ${file.name}:`, error);

          // Handle abort during file processing
          if(error.name === 'AbortError') {
            throw error; // Re-throw to be handled at method level
          }

          // Handle file-specific errors
          const fileError = {
            success: false,
            scanType: this.config.scanType,
            error: error.message === 'FILE_SCAN_TIMEOUT' ? 
              `File scan timed out after ${timeoutMs / 1000}s` : 
              `File scanning failed: ${error.message}`,
            code: error.message === 'FILE_SCAN_TIMEOUT' ? 'FILE_SCAN_TIMEOUT' : 'FILE_SCAN_ERROR',
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
              processedIndex: processedFiles
            }
          };

          if(processAll) {
            // Add error result and continue
            allResults.push(fileError);
            console.log(`File ${processedFiles} failed, continuing with remaining files...`);
          } else {
            // First failure mode - could either fail immediately or continue
            // For now, continue to next file unless it's an abort
            console.log(`File ${processedFiles} failed, trying remaining files...`);
          }
        }
      }

      /**
      * FINAL RESULT COMPILATION
      * 
      * Compiles final results based on processing mode.
      * Returns appropriate success/failure response.
      * Includes processing statistics and file information.
      */
      const totalElapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);

      if(processAll) {
        // Return all results
        const successCount = allResults.filter(r => r.success !== false).length;
        return {
          success: successCount > 0,
          scanType: this.config.scanType,
          results: allResults,
          summary: {
            totalFiles: fileArray.length,
            processedFiles,
            successfulFiles: successCount,
            failedFiles: allResults.length - successCount,
            totalTime: totalElapsed + 's'
          }
        };
      } else {
        // No successful results found in any file
        return {
          success: false,
          scanType: this.config.scanType,
          error: `No optical codes found in any of the ${processedFiles} processed files`,
          code: 'NO_RESULTS_IN_FILES',
          summary: {
            totalFiles: fileArray.length,
            processedFiles,
            totalTime: totalElapsed + 's'
          }
        };
      }

    } catch (error) {
      /**
      * ERROR HANDLING WITH ABORT LOGIC
      * 
      * Handles various error conditions in file scanning:
      *  - Abort after successful scan (race condition)
      *  - Cancellation during file processing
      *  - File access or format errors
      *  - Configuration errors
      * Provides detailed error information including file processing progress.
      */
      console.error('File scan error:', error);
      
      // ABORT LOGIC - Handle abort after successful scan (race condition)
      if(error.name === 'AbortError' && scanSucceeded) {
        console.log('Ignoring abort error after successful file scan (cleanup race condition)');
        return {
          success: true,
          scanType: this.config.scanType,
          message: 'File scan completed successfully despite cleanup abort',
          filesProcessed: processedFiles
        };
      }
      
      // Handle cancellation gracefully
      if(error.name === 'AbortError' || error.message.includes('cancelled')) {
        const elapsed = scanStartTime ? ((Date.now() - scanStartTime) / 1000).toFixed(1) : '0';
        return {
          success: false,
          cancelled: true,
          scanType: this.config.scanType,
          error: 'File scanning cancelled',
          filesProcessed: processedFiles,
          duration: elapsed + 's'
        };
      }
      
      // Handle other errors
      const elapsed = scanStartTime ? ((Date.now() - scanStartTime) / 1000).toFixed(1) : '0';
      return {
        success: false,
        scanType: this.config.scanType,
        error: error.message || 'File scanning failed',
        code: 'FILE_SCAN_ERROR',
        filesProcessed: processedFiles,
        duration: elapsed + 's'
      };
    }
  }

  /**
  * Build plugin options specifically for file scanning.
  * @private
  * @returns {object} File-optimized plugin options
  */
  _buildFilePluginOptions() {
    const pluginOptions = {};

    if(!this.config.licenseKey) {
      return pluginOptions;
    }

    const licenseKey = this.config.licenseKey;

    // MRZ Plugin - use 'file' mode instead of 'camera' mode
    if(this._opticalScanner.getSupportedFormats().includes('mrz')) {
      pluginOptions.mrz = {
        licenseKey,
        mrzMode: 'file', // ← KEY DIFFERENCE: file mode for file scanning
        // Note: scannerConfig not needed for file mode
      };
    }

    // Enhanced PDF417 - same as camera scanning
    if(this._opticalScanner.getSupportedFormats().includes('pdf417_enhanced')) {
      pluginOptions.pdf417_enhanced = {
        licenseKey,
        useDynamsoft: true,
        parseDL: true
      };
    }

    return pluginOptions;
  }

  /**
  * Get timeout configuration for file scanning.
  * @private
  * @param {string[]} formats - Formats being scanned
  * @returns {object} File timeout configuration
  */
  _getFileTimeoutConfig(formats) {
    // File scanning typically needs longer timeouts
    if(formats.includes('mrz')) {
      return {
        scanTimeout: 60000,    // 60 seconds for MRZ file processing
        description: 'MRZ file processing (60s timeout)'
      };
    } else if(formats.includes('pdf417_enhanced')) {
      return {
        scanTimeout: 30000,    // 30 seconds for enhanced PDF417
        description: 'Enhanced PDF417 file processing (30s timeout)'
      };
    } else {
      return {
        scanTimeout: 20000,    // 20 seconds for standard formats
        description: 'Standard file processing (20s timeout)'
      };
    }
  }

  // ================================================================================
  // CAMERA CONTROL METHODS - NOT TESTED Sep 15, 2025
  // ================================================================================

  /**
  * Toggle or set torch (flashlight) state.
  * 
  * @param {boolean} enabled - True to turn on torch, false to turn off, undefined to toggle
  * @returns {Promise<boolean>} New torch state (true if on, false if off)
  */
  async setTorch(enabled) {
    /**
    * TORCH CONTROL
    * 
    * Controls camera flashlight/torch using camera constraints.
    * Validates camera state and torch capability before applying.
    * Returns actual torch state after operation.
    */
    if(!this._stream) {
      throw new Error('Camera not started. Call start() first to control torch.');
    }

    // Get current capabilities to check if torch is supported
    const capabilities = cameraUtils.getCameraCapabilities(this._stream);
    if(!capabilities.torch) {
      throw new Error('Torch/flashlight not supported by current camera');
    }

    // Determine target state (toggle if not specified)
    const currentState = this._torchState || false;
    const targetState = enabled !== undefined ? enabled : !currentState;

    try {
      console.log(`Setting torch: ${currentState} -> ${targetState}`);
      
      // Apply torch constraint using camera utilities
      await cameraUtils.applyCameraConstraints(this._stream, {
        torch: targetState
      });

      // Update internal state
      this._torchState = targetState;
      
      console.log(`Torch ${targetState ? 'enabled' : 'disabled'} successfully`);
      return targetState;

    } catch(error) {
      console.error('Torch control error:', error);
      throw new Error(`Failed to ${targetState ? 'enable' : 'disable'} torch: ${error.message}`);
    }
  }

  /**
  * Set camera zoom level.
  * 
  * @param {number} level - Zoom level (within camera's supported range)
  * @returns {Promise<number>} Actual zoom level set
  */
  async setZoom(level) {
    /**
    * ZOOM CONTROL
    * 
    * Controls camera zoom level using camera constraints.
    * Validates zoom capability and level range before applying.
    * Returns actual zoom level after operation.
    */
    if(!this._stream) {
      throw new Error('Camera not started. Call start() first to control zoom.');
    }

    // Get current capabilities to check zoom support and range
    const capabilities = cameraUtils.getCameraCapabilities(this._stream);
    if(!capabilities.zoom) {
      throw new Error('Zoom not supported by current camera');
    }

    // Validate zoom level is within supported range
    const { min = 1, max = 8 } = capabilities.zoomRange || {};
    if(level < min || level > max) {
      throw new Error(`Zoom level ${level} outside supported range ${min}-${max}`);
    }

    try {
      const currentLevel = this._zoomLevel || 1;
      console.log(`Setting zoom: ${currentLevel} -> ${level}`);
      
      // Apply zoom constraint using camera utilities
      await cameraUtils.applyCameraConstraints(this._stream, {
        zoom: level
      });

      // Update internal state
      this._zoomLevel = level;
      
      console.log(`Zoom set to ${level} successfully`);
      return level;

    } catch(error) {
      console.error('Zoom control error:', error);
      throw new Error(`Failed to set zoom to ${level}: ${error.message}`);
    }
  }

  /**
  * Switch to a different camera device.
  * 
  * @param {string} deviceId - Camera device ID to switch to
  * @returns {Promise<HTMLVideoElement>} Video element with new camera stream
  */
  async switchCamera(deviceId) {
    /**
    * CAMERA SWITCHING
    * 
    * Switches to a different camera device by restarting the camera stream.
    * Maintains current configuration (scan type, plugin options, etc.).
    * Preserves video element for framework display.
    */
    if(!deviceId) {
      throw new Error('Device ID is required for camera switching');
    }

    // Validate device ID exists in available cameras
    const availableCameras = await cameraUtils.getCameraList();
    const targetCamera = availableCameras.find(camera => camera.deviceId === deviceId);
    
    if(!targetCamera) {
      throw new Error(`Camera device ${deviceId} not found in available cameras`);
    }

    try {
      console.log(`Switching camera to: ${targetCamera.label || deviceId}`);
      
      // Stop current camera
      if(this._stream) {
        // Stop camera stream
        cameraUtils.stopCameraStream(this._stream);
        this._stream = null;
      }

      // Create new constraints with specific device ID
      const constraints = cameraUtils.getDefaultConstraints({
        facingMode: undefined, // Remove facingMode when using specific deviceId
        width: 1280,
        height: 720
      });
      
      // Override with specific device ID
      constraints.video.deviceId = { exact: deviceId };

      console.log('Starting new camera with constraints:', constraints);

      // Start new camera stream
      this._stream = await cameraUtils.startCameraStream(constraints);

      // Update existing video element with new stream
      if(this._videoElement) {
        this._videoElement.srcObject = this._stream;
        
        // Wait for new video to load
        await new Promise((resolve, reject) => {
          this._videoElement.onloadedmetadata = () => resolve();
          this._videoElement.onerror = () => reject(new Error('Failed to load new camera stream'));
          setTimeout(() => reject(new Error('Camera switch timeout')), 10000);
        });
      }

      // Reset camera state (torch, zoom get reset when switching cameras)
      this._torchState = false;
      this._zoomLevel = 1;

      console.log(`Successfully switched to camera: ${targetCamera.label || deviceId}`);
      return this._videoElement;

    } catch(error) {
      console.error('Camera switch error:', error);
      
      // Try to recover by restarting original camera
      try {
        console.log('Attempting to recover original camera...');
        await this.start(); // This will restart with default camera
      } catch(recoveryError) {
        console.error('Failed to recover camera:', recoveryError);
      }
      
      throw new Error(`Failed to switch camera: ${error.message}`);
    }
  }

  // ========================================
  // CAMERA INFORMATION METHODS
  // ========================================
  // Disclaimer: Consistent API - everything goes through CameraScanner
  // getCameraCapabilities and getCameraList functions are present in
  // utils/camera.js

  /**
  * Get current camera capabilities.
  * 
  * @returns {object} Camera capabilities (zoom, torch, ranges)
  */
  getCameraCapabilities() {
    /**
    * CAMERA CAPABILITIES
    * 
    * Returns current camera's supported features and ranges.
    * Used by UI to show/hide controls and validate inputs.
    */
    if(!this._stream) {
      return {
        zoom: false,
        torch: false,
        zoomRange: null
      };
    }

    try {
      // Get camera capabilities
      const capabilities = cameraUtils.getCameraCapabilities(this._stream);
      return capabilities;
    } catch(error) {
      console.error('Error getting camera capabilities:', error);
      return {
        zoom: false,
        torch: false,
        zoomRange: null
      };
    }
  }

  /**
  * Get list of available camera devices.
  * 
  * @returns {Promise<MediaDeviceInfo[]>} Array of available camera devices
  */
  async getCameraList() {
    /**
    * CAMERA ENUMERATION
    * 
    * Returns list of available camera devices for UI selection.
    * Filters to only video input devices.
    */
    try {
      // Get camera list
      const cameras = await cameraUtils.getCameraList();
      return cameras;
    } catch(error) {
      console.error('Error getting camera list:', error);
      return [];
    }
  }

  /**
  * Get current camera control states.
  * 
  * @returns {object} Current torch and zoom states
  */
  getCameraStates() {
    /**
    * CAMERA STATE INFORMATION
    * 
    * Returns current state of camera controls.
    * Useful for UI to show current settings.
    */
    return {
      torch: this._torchState || false,
      zoom: this._zoomLevel || 1,
      cameraActive: !!this._stream,
      videoReady: !!this._videoElement
    };
  }

}
