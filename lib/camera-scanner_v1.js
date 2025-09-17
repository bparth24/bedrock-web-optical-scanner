/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved. V1
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
 * High-level camera scanner that provides a simple API for framework
 * integration. Handles all scanning complexities internally - frameworks
 * just handle UI.
 */
export class CameraScanner {
  constructor(options = {}) {
    // Simple validation
    const {scanType, scanMode = 'first', licenseKey = ''} = options;

    if(!['mrz', 'barcode'].includes(scanType)) {
      throw new Error('scanType must be "mrz" or "barcode"');
    }

    if(!['first', 'all', 'exhaustive'].includes(scanMode)) {
      throw new Error('scanMode must be "first", "all", or "exhaustive"');
    }

    // Store simple configuration - no runtime updates
    this.config = {
      scanType,
      scanMode,
      licenseKey
    };

    // Internal state - frameworks don't need to know about this
    this._stream = null;
    this._videoElement = null;
    this._opticalScanner = null;
    this._isScanning = false;

    // Simple configuration setup matching Iteration 0
    this._initializeConfiguration();
  }

  /**
   * Initialize scanner configuration with simple Iteration 0 approach.
   *
   * @private
   */
  _initializeConfiguration() {
    // Simple format detection - exactly like Iteration 0
    if(this.config.scanType === 'mrz') {
      this._formats = ['mrz'];
      this._useContinuousScanning = false;
      this._mrzMode = 'camera'; // Default for MRZ
    } else {
      this._formats = ['qr_code', 'pdf417_enhanced', 'pdf417'];
      this._useContinuousScanning = true;
      this._mrzMode = 'element'; // Not used for barcodes
    }

    // Simple plugin options - exactly like Iteration 0 working code
    this._pluginOptions = {};

    if(this.config.licenseKey) {
      // MRZ plugin options
      if(this.config.scanType === 'mrz') {
        this._pluginOptions.mrz = {
          licenseKey: this.config.licenseKey,
          mrzMode: this._mrzMode,
          scannerConfig: {
            container: null, // Will be set in start() method
            scannerViewConfig: {
              enableAutoCapture: true,
              autoCaptureSensitivity: 0.8,
              documentDetection: true,
              stableDetectionCount: 3,
              showScanGuide: true,
              showUploadImage: true,
              showFormatSelector: false,
              showSoundToggle: true,
              showPoweredByDynamsoft: true
            },
            resultViewConfig: {
              showResult: true,
              enableResultVerification: true
            }
          }
        };
      }

      // Enhanced PDF417 plugin options
      if(this.config.scanType === 'barcode') {
        this._pluginOptions.pdf417_enhanced = {
          licenseKey: this.config.licenseKey,
          useDynamsoft: true,
          parseDL: true
        };
      }
    }

    // Initialize the low-level scanner with all plugins
    const allPlugins = [
      qrCodePlugin,
      pdf417Plugin,
      enhancedPdf417Plugin,
      mrzPlugin
    ].filter(plugin => plugin);

    this._opticalScanner = new OpticalScanner({
      plugins: allPlugins
    });

    console.log('CameraScanner initialized:', {
      scanType: this.config.scanType,
      formats: this._formats,
      useContinuous: this._useContinuousScanning,
      hasLicense: !!this.config.licenseKey,
      supportedFormats: this._opticalScanner.getSupportedFormats()
    });
  }

  /**
   * Get simple timeout value based on scan type and format.
   * Uses exact values from Iteration 0 working code.
   *
   * @private
   */
  _getTimeout() {
    // Timeout constants from Iteration 0 working code
    const TIMEOUT_CONFIG = {
      mrz_camera: 0, // No timeout for MRZ camera mode (user-driven)
      mrz_element: 30000, // 30 seconds for MRZ element mode
      pdf417_enhanced: 20000, // 20 seconds for enhanced PDF417
      pdf417: 10000, // 10 seconds for basic PDF417
      qr_code: 10000, // 10 seconds for QR codes
      default: 12000, // 12 seconds default (from scanAny method)
      minScanTime: 1500, // 1.5 seconds minimum for UX
      continuousInterval: 2500 // 2.5 seconds between continuous scans
    };

    if(this.config.scanType === 'mrz') {
      const isCameraMode = this._pluginOptions?.mrz?.mrzMode === 'camera';
      return isCameraMode ?
        TIMEOUT_CONFIG.mrz_camera :
        TIMEOUT_CONFIG.mrz_element;
    }

    // For barcodes, use format-specific timeout
    const primaryFormat = this._formats[0];
    return TIMEOUT_CONFIG[primaryFormat] || TIMEOUT_CONFIG.default;
  }

  /**
   * Get minimum scan time for UX (from Iteration 0).
   *
   * @private
   */
  _getMinScanTime() {
    // Skip minimum time for MRZ formats (from Iteration 0 logic)
    return this._formats.includes('mrz') ? 0 : 1500;
  }

  /**
   * Get continuous scanning interval (from Iteration 0).
   *
   * @private
   */
  _getContinuousInterval() {
    return 2500; // 2.5 seconds between attempts
  }

  /**
   * Start camera and handle container management.
   * Updated for Step 2: Works with high-level workflow methods.
   * Can be used directly or via startScanning() workflow method.
   *
   * @param {HTMLElement} container - DOM container element for camera display.
   * @param {object} options - Optional camera configuration.
   * @returns {Promise<object>} Camera setup result.
   */
  async start(container, options = {}) {
    console.log('=== CAMERA SCANNER START ===');
    console.log('Scan type:', this.config.scanType);
    console.log('Container provided:', !!container);
    console.log('Options:', options);

    if(!container || !(container instanceof HTMLElement)) {
      const error = 'Valid container element is required';
      console.error('Start validation failed:', error);
      throw new Error(error);
    }

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
      console.log('Starting camera for scan type:', this.config.scanType);

      // === CAMERA STREAM CREATION ===
      // Create camera stream with optimized constraints.
      const constraints = this._getCameraConstraints(options);
      console.log('Camera constraints:', constraints);
      this._stream = await cameraUtils.startCameraStream(constraints);
      console.log('Camera stream created successfully');

      // === VIDEO ELEMENT CREATION ===
      // Create video element with proper configuration.
      console.log('Creating video element...');
      this._videoElement = await Promise.race([
        cameraUtils.createVideoElement(this._stream, {
          autoplay: true,
          muted: true,
          playsInline: true
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Video creation timeout')), 10000)
        )
      ]);

      console.log('Video element created:', {
        width: this._videoElement.videoWidth,
        height: this._videoElement.videoHeight,
        readyState: this._videoElement.readyState
      });

      // === CONTAINER MANAGEMENT ===
      // Handle container setup with MRZ container update logic.
      this._handleContainerSetup(container);

      // === SUCCESS RESPONSE ===
      const result = {
        success: true,
        videoReady: this._videoElement.readyState >= 2,
        scanType: this.config.scanType,
        formats: this._formats,
        containerStrategy: this.config.scanType === 'mrz' &&
          this._pluginOptions.mrz?.mrzMode === 'camera' ?
          'dynamsoft_native' : 'video_insertion',
        videoInfo: {
          width: this._videoElement.videoWidth,
          height: this._videoElement.videoHeight,
          readyState: this._videoElement.readyState
        }
      };

      console.log('=== CAMERA START SUCCESSFUL ===');
      console.log('Start result:', result);
      return result;

    } catch(error) {
      console.error('=== CAMERA START FAILED ===');
      console.error('Error:', error);

      // Clean up on failure.
      this.stop();

      // Provide specific error messages.
      let userMessage = 'Failed to start camera';
      let errorCode = 'CAMERA_START_ERROR';

      if(error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access.';
        errorCode = 'CAMERA_PERMISSION_DENIED';
      } else if(error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera.';
        errorCode = 'NO_CAMERA_FOUND';
      } else if(error.message.includes('timeout')) {
        userMessage = 'Camera initialization timed out. Please try again.';
        errorCode = 'CAMERA_TIMEOUT';
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
   * Handle container setup with improved logic.
   * Enhanced for Step 2: Better container management and logging.
   *
   * @private
   * @param {HTMLElement} container - Container element for camera display.
   */
  _handleContainerSetup(container) {
    console.log('=== CONTAINER SETUP ===');
    console.log('Container tag:', container.tagName);
    console.log('Container classes:', container.className);
    console.log('Scan type:', this.config.scanType);

    // Clear any existing content.
    container.innerHTML = '';
    console.log('Container cleared');

    // === MRZ CAMERA MODE DETECTION ===
    // Check if this is MRZ with Dynamsoft native UI.
    if(this.config.scanType === 'mrz' &&
       this._pluginOptions.mrz?.mrzMode === 'camera') {
      console.log('=== MRZ DYNAMSOFT NATIVE UI MODE ===');

      // Update MRZ plugin container reference for Dynamsoft native UI.
      if(this._pluginOptions.mrz.scannerConfig) {
        this._pluginOptions.mrz.scannerConfig.container = container;
        console.log('Updated MRZ container reference for Dynamsoft native UI');
        console.log('Dynamsoft will populate this container automatically');
      } else {
        console.warn('MRZ scannerConfig not found, cannot update container');
      }

    } else {
      console.log('=== VIDEO ELEMENT INSERTION MODE ===');

      // Insert video element for barcode scanning or MRZ element mode.
      this._videoElement.style.width = '100%';
      this._videoElement.style.height = '100%';
      this._videoElement.style.objectFit = 'cover';
      container.appendChild(this._videoElement);

      console.log('Video element inserted into container');
      console.log('Video element styling applied');
      console.log('Container children count:', container.children.length);
    }

    console.log('=== CONTAINER SETUP COMPLETE ===');
  }

  /**
   * Get camera constraints with optional overrides.
   * Updated for Step 2: Supports constraint customization.
   *
   * @private
   * @param {object} options - Optional constraint overrides.
   * @param {string} options.facingMode - Camera facing mode.
   * @param {object} options.video - Video constraint overrides.
   * @returns {object} MediaStream constraints.
   */
  _getCameraConstraints(options = {}) {
    console.log('=== BUILDING CAMERA CONSTRAINTS ===');
    console.log('Default constraints requested');
    console.log('Options provided:', options);

    // Base constraints matching Iteration 0 working values.
    const baseConstraints = {
      video: {
        facingMode: 'environment',
        width: {ideal: 1920, min: 1280},
        height: {ideal: 1080, min: 720},
        frameRate: {ideal: 30},
        focusMode: 'continuous',
        exposureMode: 'continuous'
      }
    };

    // Apply any overrides.
    const finalConstraints = {
      ...baseConstraints,
      video: {
        ...baseConstraints.video,
        ...options.video
      }
    };

    // Apply facingMode override if provided.
    if(options.facingMode) {
      finalConstraints.video.facingMode = options.facingMode;
    }

    console.log('Final camera constraints:', finalConstraints);
    return finalConstraints;
  }

  // ========================================
  // FRAMEWORK INTEGRATION UTILITIES
  // ========================================
  // Simple utilities for framework components - no over-engineering.

  /**
   * Get current camera states for UI updates.
   * Provides essential state information for framework components.
   *
   * @returns {object} Current camera control states and info.
   */
  getCameraStates() {
    const states = {
      // Basic states.
      cameraActive: !!this._stream,
      videoReady: !!this._videoElement && this._videoElement.readyState >= 2,
      isScanning: this._isScanning,

      // Configuration info for UI.
      scanType: this.config.scanType,
      formats: this._formats,
      useContinuous: this._useContinuousScanning,

      // Control states.
      capabilities: this.getCameraCapabilities()
    };

    console.log('Camera states requested:', states);
    return states;
  }

  /**
   * Get current configuration.
   */
  getConfig() {
    return {
      ...this.config,
      formats: this._formats,
      useContinuousScanning: this._useContinuousScanning,
      timeout: this._getTimeout(),
      minScanTime: this._getMinScanTime()
    };
  }

  /**
   * Get camera capabilities.
   */
  getCameraCapabilities() {
    if(!this._stream) {
      return {zoom: false, torch: false, zoomRange: null};
    }

    return cameraUtils.getCameraCapabilities(this._stream);
  }

  /**
   * Set torch state.
   *
   * @param enabled
   */
  async setTorch(enabled) {
    if(!this._stream) {
      throw new Error('Camera not started');
    }

    const capabilities = this.getCameraCapabilities();
    if(!capabilities.torch) {
      throw new Error('Torch not supported');
    }

    await cameraUtils.applyCameraConstraints(this._stream, {
      torch: enabled
    });

    return enabled;
  }

  /**
   * Set zoom level.
   *
   * @param level
   */
  async setZoom(level) {
    if(!this._stream) {
      throw new Error('Camera not started');
    }

    const capabilities = this.getCameraCapabilities();
    if(!capabilities.zoom) {
      throw new Error('Zoom not supported');
    }

    const {min = 1, max = 8} = capabilities.zoomRange || {};
    if(level < min || level > max) {
      throw new Error(`Zoom level ${level} outside range ${min}-${max}`);
    }

    await cameraUtils.applyCameraConstraints(this._stream, {
      zoom: level
    });

    return level;
  }

  /**
   * Switch camera device.
   *
   * @param deviceId
   */
  async switchCamera(deviceId) {
    if(!deviceId) {
      throw new Error('Device ID required');
    }

    const cameras = await cameraUtils.getCameraList();
    const camera = cameras.find(c => c.deviceId === deviceId);

    if(!camera) {
      throw new Error(`Camera ${deviceId} not found`);
    }

    // Stop current camera
    if(this._stream) {
      cameraUtils.stopCameraStream(this._stream);
      this._stream = null;
    }

    // Start new camera
    const constraints = this._getCameraConstraints();
    constraints.video.deviceId = {exact: deviceId};

    this._stream = await cameraUtils.startCameraStream(constraints);

    if(this._videoElement) {
      this._videoElement.srcObject = this._stream;
      await new Promise((resolve, reject) => {
        this._videoElement.onloadedmetadata = resolve;
        this._videoElement.onerror = reject;
        setTimeout(() => reject(new Error('Camera switch timeout')), 10000);
      });
    }

    return this._videoElement;
  }

  // ========================================
  // CONTAINER DETECTION AND FRAMEWORK UTILITIES
  // ========================================
  // Essential utilities that remove container selection logic from Vue.
  // Keeps Person 1's preference for imperative promise-based APIs.

  /**
   * Auto-detect appropriate container for scanning and start camera.
   * Combines container detection with camera startup for framework convenience.
   * Maintains imperative promise-based API as Person 1 preferred.
   *
   * @param {HTMLElement} parentContainer - Parent element containing UI containers.
   * @param {object} options - Optional camera configuration.
   * @returns {Promise<object>} Camera setup result with container info.
   */
  async startWithContainer(parentContainer, options = {}) {
    console.log('=== START WITH AUTO CONTAINER DETECTION ===');
    console.log('Scan type:', this.config.scanType);
    console.log('Parent container provided:', !!parentContainer);

    if(!parentContainer || !(parentContainer instanceof HTMLElement)) {
      throw new Error('Valid parent container element is required');
    }

    // === CONTAINER DETECTION ===
    // Auto-detect appropriate container based on scan type.
    const targetContainer = this._detectScanContainer(parentContainer);

    if(!targetContainer) {
      throw new Error(
        `Could not find appropriate container for scan type: ${this.config.scanType}`
      );
    }

    console.log('Target container detected:', {
      scanType: this.config.scanType,
      containerFound: !!targetContainer,
      containerTag: targetContainer.tagName
    });

    // === DELEGATE TO STANDARD START ===
    // Use existing start() method with detected container.
    const result = await this.start(targetContainer, options);

    // Add container detection info to result.
    return {
      ...result,
      containerDetection: {
        parentContainer: parentContainer.tagName,
        targetContainer: targetContainer.tagName,
        autoDetected: true
      }
    };
  }

  /**
   * Auto-detect appropriate container for scanning based on scan type.
   * Removes container selection logic from Vue component.
   *
   * @private
   * @param {HTMLElement} parentContainer - Parent element to search within.
   * @returns {HTMLElement|null} Detected container or null if not found.
   */
  _detectScanContainer(parentContainer) {
    console.log('=== DETECTING SCAN CONTAINER ===');
    console.log('Scan type:', this.config.scanType);
    console.log('Parent container children:', parentContainer.children.length);

    let targetContainer = null;

    if(this.config.scanType === 'mrz') {
      // === MRZ CONTAINER DETECTION ===
      // Look for MRZ-specific container first.
      targetContainer = parentContainer.querySelector('.mrz-container') ||
                       parentContainer.querySelector('[data-container="mrz"]') ||
                       parentContainer.querySelector('.scanner-mrz-container');

      if(!targetContainer) {
        // Fallback to generic container for MRZ.
        console.log('MRZ-specific container not found, using parent container');
        targetContainer = parentContainer;
      } else {
        console.log('MRZ container found:', targetContainer.className);
      }
    } else {
      // === BARCODE CONTAINER DETECTION ===
      // Look for video/barcode-specific container first.
      targetContainer = parentContainer.querySelector('.video-container') ||
                       parentContainer.querySelector('[data-container="video"]') ||
                       parentContainer.querySelector('.scanner-video-container');

      if(!targetContainer) {
        // Fallback to generic container for barcodes.
        console.log('Video container not found, using parent container');
        targetContainer = parentContainer;
      } else {
        console.log('Video container found:', targetContainer.className);
      }
    }

    console.log('Container detection result:', {
      found: !!targetContainer,
      containerType: this.config.scanType === 'mrz' ? 'MRZ' : 'Video',
      element: targetContainer ? targetContainer.tagName : 'None'
    });

    return targetContainer;
  }

  /**
   * Perform a single scan using current configuration.
   * Simple delegate to OpticalScanner.scan() with proper setup.
   *
   * @param {object} options - Optional scan options to override defaults.
   * @param {string[]} options.formats - Override scan formats.
   * @param {string} options.mode - Override scan mode.
   * @param {AbortSignal} options.signal - Abort signal for cancellation.
   * @returns {Promise<object>} Formatted scan result.
   */
  async scan(options = {}) {
    console.log('=== CAMERA SCANNER SINGLE SCAN START ===');
    console.log('Scan type:', this.config.scanType);
    console.log('Current formats:', this._formats);
    console.log('Options provided:', options);

    // === VALIDATION BLOCK ===
    // Ensure camera is ready for scanning
    if(!this._videoElement || !this._stream) {
      const error = 'Camera not started. Call start() first.';
      console.error('Scan validation failed:', error);
      throw new Error(error);
    }

    if(this._isScanning) {
      const error = 'Scan already in progress. Wait for current scan to complete.';
      console.error('Scan validation failed:', error);
      throw new Error(error);
    }

    // === CONFIGURATION BLOCK ===
    // Build scan configuration using simple approach from Iteration 0
    const scanOptions = this._buildScanOptions(options);
    console.log('Final scan options:', scanOptions);

    // === TIMING CONFIGURATION BLOCK ===
    // Get timeout values matching Iteration 0 working code exactly
    const timeoutMs = this._getTimeout();
    const minScanTime = this._getMinScanTime();
    console.log('Timeout config:', {timeoutMs, minScanTime});

    // === SCAN EXECUTION BLOCK ===
    this._isScanning = true;
    const scanStartTime = Date.now();
    let scanSucceeded = false;
    let timeout = null;

    try {
      console.log('=== DELEGATING TO OPTICAL SCANNER ===');
      console.log('Video element ready:', this._videoElement.readyState >= 2);
      console.log('Video dimensions:', `${this._videoElement.videoWidth}x${this._videoElement.videoHeight}`);

      // === SCAN PROMISE CREATION BLOCK ===
      // Create scan promise - delegate to OpticalScanner.scan()
      const scanPromise = this._opticalScanner.scan(this._videoElement, scanOptions);
      console.log('Scan promise created, delegated to OpticalScanner.scan()');

      // === TIMEOUT HANDLING BLOCK ===
      // Add timeout wrapper only if timeout > 0 (MRZ camera mode has no timeout)
      const promises = [scanPromise];
      if(timeoutMs > 0) {
        console.log(`Setting up timeout promise: ${timeoutMs}ms`);
        const timeoutPromise = new Promise((_, reject) => {
          timeout = setTimeout(() => {
            console.log('Scan timeout triggered');
            reject(new Error('SCAN_TIMEOUT'));
          }, timeoutMs);
        });
        promises.push(timeoutPromise);
      } else {
        console.log('No timeout set (MRZ camera mode)');
      }

      // === SCAN EXECUTION BLOCK ===
      // Race between scan completion and timeout
      console.log('Starting scan race between completion and timeout...');
      const results = await Promise.race(promises);

      // === SUCCESS HANDLING BLOCK ===
      // Mark success immediately (before minimum time enforcement)
      if(results && results.length > 0) {
        scanSucceeded = true;
        console.log('Scan successful! Results found:', results.length);
        console.log('First result format:', results[0].format);
      } else {
        console.log('Scan completed but no results found');
      }

      // Clear timeout on successful completion
      if(timeout) {
        clearTimeout(timeout);
        timeout = null;
        console.log('Timeout cleared after successful scan');
      }

      // === MINIMUM SCAN TIME BLOCK ===
      // Enforce minimum scan time for better UX (from Iteration 0)
      if(minScanTime > 0) {
        const elapsedTime = Date.now() - scanStartTime;
        if(elapsedTime < minScanTime) {
          const waitTime = minScanTime - elapsedTime;
          console.log(`Enforcing minimum scan time: waiting ${waitTime}ms more`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.log(`Minimum scan time satisfied: ${elapsedTime}ms elapsed`);
        }
      }

      // === RESULT FORMATTING BLOCK ===
      // Format and return results
      if(scanSucceeded && results.length > 0) {
        const formattedResult = this._formatScanResult(results, results[0].format);
        console.log('=== SCAN SUCCESSFUL ===');
        console.log('Formatted result:', formattedResult);
        console.log('=== END SINGLE SCAN ===');
        return formattedResult;
      } else {
        const noResultsError = {
          success: false,
          scanType: this.config.scanType,
          error: 'No optical codes detected in current frame',
          code: 'NO_RESULTS'
        };
        console.log('=== NO RESULTS FOUND ===');
        console.log('Returning:', noResultsError);
        return noResultsError;
      }

    } catch(error) {
      console.error('=== SCAN ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);

      // === ERROR CLEANUP BLOCK ===
      // Clean up timeout on any error
      if(timeout) {
        clearTimeout(timeout);
        console.log('Timeout cleared due to error');
      }

      // === ERROR HANDLING BLOCK ===
      // Handle specific error types with user-friendly messages
      if(error.message === 'SCAN_TIMEOUT') {
        const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);
        const timeoutError = {
          success: false,
          scanType: this.config.scanType,
          error: `Scan timed out after ${elapsed}s - try repositioning or better lighting`,
          code: 'SCAN_TIMEOUT'
        };
        console.log('Returning timeout error:', timeoutError);
        return timeoutError;
      }

      // Handle other errors
      const generalError = {
        success: false,
        scanType: this.config.scanType,
        error: error.message || 'Scan failed',
        code: 'SCAN_ERROR'
      };
      console.log('Returning general error:', generalError);
      return generalError;

    } finally {
      // === CLEANUP BLOCK ===
      this._isScanning = false;
      const totalTime = ((Date.now() - scanStartTime) / 1000).toFixed(1);
      console.log(`=== SCAN COMPLETED - Total time: ${totalTime}s ===`);
    }
  }

  /**
   * Start continuous scanning with callback-based approach.
   * Delegates to OpticalScanner.scanContinuous() for proven logic.
   * 
   * @param {Function} onResult - Callback for successful scan results.
   * @param {Function} onError - Callback for scan errors  
   * @param {object} options - Optional scanning options
   */
  async startContinuous(onResult, onError, options = {}) {
    console.log('=== CAMERA SCANNER CONTINUOUS SCAN START ===');
    console.log('Scan type:', this.config.scanType);
    console.log('Use continuous scanning:', this._useContinuousScanning);
    console.log('Continuous scan options:', options);

    // === VALIDATION BLOCK ===
    if(!this._videoElement || !this._stream) {
      const error = new Error('Camera not started. Call start() first.');
      console.error('Continuous scan validation failed:', error.message);
      onError(error);
      return;
    }

    if(!onResult || !onError) {
      const error = new Error('onResult and onError callbacks are required');
      console.error('Callback validation failed:', error.message);
      throw error;
    }

    // === MODE DETECTION BLOCK ===
    // Check if continuous scanning is appropriate for current scan type
    if(!this._useContinuousScanning) {
      console.log('=== SINGLE SCAN MODE (MRZ) ===');
      console.log('Continuous scanning not appropriate, using single scan instead');

      // For MRZ or other non-continuous types, just do single scan
      try {
        const result = await this.scan(options);
        if(result.success) {
          console.log('Single scan successful, calling onResult');
          onResult(result);
        } else {
          console.log('Single scan failed, calling onError');
          onError(new Error(result.error || 'Single scan failed'));
        }
      } catch(error) {
        console.error('Single scan error:', error);
        onError(error);
      }
      return;
    }

    console.log('=== CONTINUOUS SCAN MODE (BARCODES) ===');

    // === CONFIGURATION BLOCK ===
    // Build configuration for continuous scanning
    const scanOptions = this._buildScanOptions(options);
    const continuousInterval = this._getContinuousInterval();
    console.log('Continuous scan config:', {scanOptions, continuousInterval});

    // === OPTICAL SCANNER CONTINUOUS METHOD CHECK ===
    // First try to use OpticalScanner's built-in continuous method
    if(typeof this._opticalScanner.scanContinuous === 'function') {
      console.log('=== USING OPTICAL SCANNER CONTINUOUS METHOD ===');
      console.log('OpticalScanner.scanContinuous() available, delegating...');

      try {
        // Delegate to OpticalScanner's proven continuous scanning
        const results = await this._opticalScanner.scanContinuous(this._videoElement, scanOptions);

        if(results && results.length > 0) {
          const formattedResult = this._formatScanResult(results, results[0].format);
          console.log('OpticalScanner continuous scan successful:', formattedResult);
          onResult(formattedResult);
        } else {
          console.log('OpticalScanner continuous scan completed with no results');
          onError(new Error('Continuous scan completed but no results found'));
        }

      } catch(error) {
        console.error('OpticalScanner continuous scan error:', error);
        onError(error);
      }

    } else {
      console.log('=== FALLBACK CONTINUOUS LOOP ===');
      console.log('OpticalScanner.scanContinuous() not available, using fallback loop');

      // === FALLBACK CONTINUOUS LOOP BLOCK ===
      // Simple continuous loop using single scans with intervals
      // This matches the approach from Iteration 0 working code
      let attempt = 0;

      while(this._stream && this._videoElement && !this._isScanning) {
        attempt++;
        console.log(`=== Continuous scan attempt #${attempt} ===`);
        console.log('Video status:', {
          width: this._videoElement.videoWidth,
          height: this._videoElement.videoHeight,
          readyState: this._videoElement.readyState
        });

        try {
          // === SINGLE SCAN ATTEMPT ===
          const result = await this.scan({...options, singleScan: true});

          if(result.success) {
            console.log(`Continuous scan successful on attempt #${attempt}`);
            onResult(result);
            return; // Exit loop on success
          } else if(result.code === 'SCAN_TIMEOUT') {
            console.log(`Attempt #${attempt}: Timeout (expected in continuous mode)`);
          } else if(result.code === 'NO_RESULTS') {
            console.log(`Attempt #${attempt}: No results (expected, continuing...)`);
          } else {
            console.log(`Attempt #${attempt}: Other error:`, result.error);
          }

        } catch(error) {
          console.error(`Continuous scan attempt #${attempt} error:`, error);

          // Check if it's a real error or expected timeout/no results
          if(error.message.includes('timeout') || error.message.includes('No results')) {
            console.log('Expected error in continuous mode, continuing...');
          } else {
            console.error('Real error in continuous scanning:', error);
            onError(error);
            return; // Exit on real errors
          }
        }

        // === INTERVAL WAIT BLOCK ===
        // Wait before next attempt (from Iteration 0: 2.5 seconds)
        console.log(`Waiting ${continuousInterval}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, continuousInterval));

        // Log every 10th attempt to avoid console spam
        if(attempt % 10 === 0) {
          console.log(`=== Continuous scanning progress: ${attempt} attempts completed ===`);
        }
      }

      console.log('=== CONTINUOUS SCANNING STOPPED ===');
      console.log('Stream or video element no longer available, exiting loop');
    }
  }

  /**
   * Scan for any recognizable format (convenience method).
   * Simple delegate to OpticalScanner.scanAny() with proper configuration.
   *
   * @param {object} options - Optional scan options.
   * @returns {Promise<object>} Scan result.
   */
  async scanAny(options = {}) {
    console.log('=== CAMERA SCANNER SCAN ANY START ===');
    console.log('Supported formats:', this._opticalScanner.getSupportedFormats());

    // === VALIDATION BLOCK ===
    if(!this._videoElement || !this._stream) {
      throw new Error('Camera not started. Call start() first.');
    }

    // === CONFIGURATION BLOCK ===
    // Use all supported formats for scanAny
    const scanOptions = {
      formats: this._opticalScanner.getSupportedFormats(),
      mode: 'first', // Stop at first result for scanAny
      pluginOptions: this._pluginOptions,
      ...options
    };

    console.log('ScanAny options:', scanOptions);

    // === DELEGATION BLOCK ===
    // Delegate to OpticalScanner.scanAny() if available, otherwise use scan()
    try {
      let results;

      if(typeof this._opticalScanner.scanAny === 'function') {
        console.log('Using OpticalScanner.scanAny() method');
        results = await this._opticalScanner.scanAny(this._videoElement, scanOptions);
      } else {
        console.log('OpticalScanner.scanAny() not available, using scan() method');
        results = await this._opticalScanner.scan(this._videoElement, scanOptions);
      }

      // === RESULT FORMATTING BLOCK ===
      if(results && results.length > 0) {
        const formattedResult = this._formatScanResult(results, results[0].format);
        console.log('ScanAny successful:', formattedResult);
        return formattedResult;
      } else {
        const noResults = {
          success: false,
          scanType: this.config.scanType,
          error: 'No recognizable optical codes found',
          code: 'NO_RESULTS'
        };
        console.log('ScanAny no results:', noResults);
        return noResults;
      }

    } catch(error) {
      console.error('ScanAny error:', error);
      return {
        success: false,
        scanType: this.config.scanType,
        error: error.message || 'ScanAny failed',
        code: 'SCAN_ANY_ERROR'
      };
    }
  }

  // ========================================
  // CONFIGURATION HELPER METHODS
  // ========================================
  // Simple helper methods to build scan options.

  /**
   * Build scan options for OpticalScanner methods.
   * Simple approach matching Iteration 0 configuration.
   *
   * @private
   * @param {object} options - Override options.
   * @param {string[]} options.formats - Override scan formats.
   * @param {string} options.mode - Override scan mode.
   * @param {AbortSignal} options.signal - Abort signal for cancellation.
   * @returns {object} Complete scan options.
   */
  _buildScanOptions(options = {}) {
    console.log('=== BUILDING SCAN OPTIONS ===');
    console.log('Default formats:', this._formats);
    console.log('Default scan mode:', this.config.scanMode);
    console.log('Override options:', options);

    const scanOptions = {
      formats: options.formats || this._formats,
      mode: options.mode || this.config.scanMode,
      pluginOptions: this._pluginOptions,
      signal: options.signal,
      ...options
    };

    console.log('Built scan options:', scanOptions);
    console.log('Plugin options keys:', Object.keys(this._pluginOptions));
    return scanOptions;
  }

  // ========================================
  // RESULT FORMATTING METHODS
  // ========================================
  // Move result formatting logic from Vue component here.

  /**
   * Format scan results into consistent output format.
   * Moved from Vue component to centralize business logic.
   *
   * @private
   * @param {object[]} results - Raw scanner results.
   * @param {string} detectedFormat - The format that was detected.
   * @returns {object} Formatted result.
   */
  _formatScanResult(results, detectedFormat) {
    console.log('=== FORMATTING SCAN RESULT ===');
    console.log('Raw results:', results);
    console.log('Detected format:', detectedFormat);

    if(!results || results.length === 0) {
      const emptyResult = {
        success: false,
        scanType: this.config.scanType,
        error: 'No results to format'
      };
      console.log('No results to format:', emptyResult);
      return emptyResult;
    }

    const result = results[0];
    console.log('First result data:', result);

    // === FORMAT-SPECIFIC PROCESSING ===
    let formattedResult;

    switch(detectedFormat) {
      case 'mrz':
        console.log('Formatting MRZ result...');
        formattedResult = this._formatMrzResult(result);
        break;

      case 'pdf417_enhanced':
        console.log('Formatting Enhanced PDF417 result...');
        formattedResult = this._formatDriverLicenseResult(result);
        break;

      case 'pdf417':
        console.log('Formatting PDF417 result...');
        formattedResult = this._formatPdf417Result(result);
        break;

      case 'qr_code':
        console.log('Formatting QR Code result...');
        formattedResult = this._formatQrCodeResult(result);
        break;

      default:
        console.log('Formatting generic result...');
        formattedResult = this._formatGenericResult(result, detectedFormat);
        break;
    }

    // === ADD METADATA ===
    const finalResult = {
      ...formattedResult,
      success: true,
      scanType: this.config.scanType,
      format: detectedFormat,
      timestamp: new Date().toISOString()
    };

    console.log('=== FORMATTED RESULT ===');
    console.log('Final formatted result:', finalResult);
    return finalResult;
  }

  /**
   * Format MRZ scanning results.
   *
   * @private
   * @param {object} result - Raw MRZ scan result.
   * @returns {object} Formatted MRZ result with validation.
   */
  _formatMrzResult(result) {
    console.log('=== MRZ RESULT FORMATTING ===');
    console.log('Raw MRZ result:', result);
    console.log('result.rawData:', result.rawData);

    if(result.rawData && result.rawData[0]) {
      console.log('result.rawData[0].data:', result.rawData[0].data);
      console.log('result.rawData[0].validation:', result.rawData[0].validation);
    }

    const mrzData = result.rawData?.[0]?.data || {};
    const validation = result.rawData?.[0]?.data?.validation ||
                      result.rawData?.[0]?.validation || {};
    const invalidFields = result.rawData?.[0]?.data?.invalidFields ||
                         result.rawData?.[0]?.invalidFields || [];

    console.log('Extracted MRZ data:', mrzData);
    console.log('Validation info:', validation);
    console.log('Invalid fields:', invalidFields);

    // Simple validation check (from working Iteration 0).
    const isValid = validation.overallStatus === 'complete' ||
                   (validation.overallStatus === 'partial' &&
                    invalidFields.length === 0);

    const formatted = {
      type: 'MRZ',
      fields: mrzData,
      valid: isValid,
      validation,
      invalidFields
    };

    console.log('Formatted MRZ result:', formatted);
    return formatted;
  }

  /**
   * Format Enhanced PDF417 (Driver License) results.
   *
   * @private
   * @param {object} result - Raw enhanced PDF417 scan result.
   * @returns {object} Formatted driver license result.
   */
  _formatDriverLicenseResult(result) {
    console.log('=== DRIVER LICENSE RESULT FORMATTING ===');
    console.log('Raw DL result:', result);

    // Check for nested driver license data.
    if(result.data && result.data[0] && result.data[0].driverLicense) {
      const dl = result.data[0].driverLicense;
      console.log('Found driver license data:', dl);

      return {
        type: 'DL',
        fields: dl,
        parsed: true,
        text: result.data[0].text || dl.raw ||
          'Enhanced PDF417 with parsed data'
      };
    }

    // Check if it has driver license data directly.
    if(result.driverLicense) {
      console.log('Found direct driver license data:', result.driverLicense);

      return {
        type: 'DL',
        fields: result.driverLicense,
        parsed: true,
        text: result.text || 'Enhanced PDF417 with parsed data'
      };
    }

    // Fallback for other structures.
    console.log('Using fallback DL formatting');
    return {
      type: 'DL',
      fields: result.fields || {},
      parsed: false,
      text: result.text || 'Enhanced PDF417 data'
    };
  }

  /**
   * Format PDF417 results.
   *
   * @private
   * @param {object} result - Raw PDF417 scan result.
   * @returns {object} Formatted PDF417 result.
   */
  _formatPdf417Result(result) {
    console.log('=== PDF417 RESULT FORMATTING ===');
    console.log('Raw PDF417 result:', result);

    let pdf417Text = result.text;

    // Handle different data structures.
    if(!pdf417Text && result.data && Array.isArray(result.data)) {
      const firstData = result.data[0];
      if(typeof firstData === 'string') {
        pdf417Text = firstData;
      } else if(firstData && firstData.text) {
        pdf417Text = firstData.text;
      } else if(firstData && firstData.rawValue) {
        pdf417Text = firstData.rawValue;
      }
    }

    const formatted = {
      type: 'PDF_417',
      text: pdf417Text || 'No PDF417 text found'
    };

    console.log('Formatted PDF417 result:', formatted);
    return formatted;
  }

  /**
   * Format QR Code results.
   *
   * @private
   * @param {object} result - Raw QR code scan result.
   * @returns {object} Formatted QR code result.
   */
  _formatQrCodeResult(result) {
    console.log('=== QR CODE RESULT FORMATTING ===');
    console.log('Raw QR result:', result);

    let qrText = result.text;

    // Handle different data structures.
    if(!qrText && result.data && Array.isArray(result.data)) {
      const firstData = result.data[0];
      if(typeof firstData === 'string') {
        qrText = firstData;
      } else if(firstData && firstData.text) {
        qrText = firstData.text;
      } else if(firstData && firstData.rawValue) {
        qrText = firstData.rawValue;
      }
    }

    const formatted = {
      type: 'QR_CODE',
      text: qrText || 'No QR code text found'
    };

    console.log('Formatted QR result:', formatted);
    return formatted;
  }

  /**
   * Format generic/unknown format results.
   *
   * @private
   * @param {object} result - Raw scan result.
   * @param {string} detectedFormat - The detected format.
   * @returns {object} Formatted generic result.
   */
  _formatGenericResult(result, detectedFormat) {
    console.log('=== GENERIC RESULT FORMATTING ===');
    console.log('Format:', detectedFormat);
    console.log('Raw result:', result);

    const formatMap = {
      qr_code: 'QR_CODE',
      pdf417: 'PDF_417',
      pdf417_enhanced: 'PDF_417',
      mrz: 'MRZ'
    };

    const formatted = {
      type: formatMap[detectedFormat] || detectedFormat.toUpperCase(),
      text: result.data?.[0]?.text || result.data || result.text ||
        'Unknown format data'
    };

    console.log('Formatted generic result:', formatted);
    return formatted;
  }

  /**
   * Clean up resources.
   */
  stop() {
    console.log('=== CAMERA SCANNER STOP ===');

    this._isScanning = false;
    console.log('Scanning flag set to false');

    if(this._stream) {
      this._stream.getTracks().forEach(track => track.stop());
      this._stream = null;
      console.log('Camera stream stopped and cleared');
    }

    if(this._videoElement) {
      this._videoElement.srcObject = null;
      this._videoElement = null;
      console.log('Video element cleared');
    }

    console.log('CameraScanner cleanup completed');
  }
}
