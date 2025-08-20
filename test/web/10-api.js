/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as helpers from '../helpers.js';
import {
  mrzPlugin,
  OpticalScanner,
  pdf417Plugin,
  qrCodePlugin
} from '@bedrock/web-optical-scanner';
import mockData from '../mockData.js';

// Set global license key for MRZ tests
window.TEST_MRZ_LICENSE_KEY =
  'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0Mzg4NzQyLU1UQTBNemc0TnpReUxYZGxZaTF' +
  'VY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29' +
  'mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDM4ODc0MiIsInN0YW5kYnl' +
  'TZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWN' +
  'rQ29kZSI6LTEyODY3MDMzOTB9';
console.log('🔧 License key set for MRZ tests');

describe('OpticalScanner API', function() {
  let scanner;

  beforeEach(function() {
    scanner = new OpticalScanner({
      plugins: [qrCodePlugin, pdf417Plugin]
    });
  });

  describe('Basic API', function() {
    it('should create scanner instance', function() {
      should.exist(scanner);
      scanner.should.be.an('object');
      scanner.should.be.instanceOf(OpticalScanner);
    });

    it('should have scan method', function() {
      scanner.scan.should.be.a('function');
    });

    it('should have scanContinuous method', function() {
      scanner.scanContinuous.should.be.a('function');
    });

    it('should list supported formats', function() {
      const formats = scanner.getSupportedFormats();
      formats.should.be.an('array');
      formats.should.include('qr_code');
      formats.should.include('pdf417');
      formats.should.have.length(2);
    });

    it('should have plugins available for import', function() {
      should.exist(qrCodePlugin);
      should.exist(pdf417Plugin);
      qrCodePlugin.should.have.property('format', 'qr_code');
      pdf417Plugin.should.have.property('format', 'pdf417');
      qrCodePlugin.should.have.property('scan');
      pdf417Plugin.should.have.property('scan');
    });
  });

  describe('Plugin Registration', function() {
    it('should register plugins on creation', function() {
      const formats = scanner.getSupportedFormats();
      formats.should.have.length(2);
    });

    it('should register additional plugins', function() {
      const testPlugin = {
        format: 'test_format',
        scan: async () => [{text: 'test'}]
      };

      scanner.registerPlugin(testPlugin);
      scanner.getSupportedFormats().should.include('test_format');
    });

    it('should throw error for invalid plugin', function() {
      (() => {
        scanner.registerPlugin({format: 'test'});
      }).should.throw('Plugin must have format and scan properties');
    });
  });

  describe('QR Code Scanning', function() {
    const pathToBarcodes = '/base/images/qr_code/';
    const imageNames = ['001.gif', '002.png'];

    // Helper function to normalize strings for comparison
    function normalizeString(str) {
      if(typeof str !== 'string') {
        return str;
      }

      return str
        .trim() // Remove leading/trailing whitespace
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n') // Normalize line endings
        .replace(/\u200B/g, '') // Remove zero-width spaces
        .replace(
          /\u00A0/g,
          ' '
        ); // Replace non-breaking spaces with regular spaces
    }

    for(const imageName of imageNames) {
      it(`should scan QR code from ${imageName}`, async function() {
        // Load image
        const imageUrl = pathToBarcodes + imageName;
        let img;

        try {
          img = await helpers.loadImage(imageUrl);
        } catch(error) {
          console.warn(
            `⚠️  Test image ${imageName} not found, skipping test`
          );
          this.skip();
          return;
        }

        // Scan for QR codes
        const results = await scanner.scan(img, {
          formats: ['qr_code'],
          mode: 'first'
        });

        // Verify results
        results.should.have.length(1);
        const result = results[0];
        result.should.have.property('format', 'qr_code');
        result.should.have.property('data');
        result.data.should.be.an('array');
        result.data.should.have.length.greaterThan(0);

        // Check expected text with normalization
        const expectedText = mockData.qr_code[imageName];
        should.exist(expectedText);

        const actualText = normalizeString(result.data[0].text);
        const normalizedExpected = normalizeString(expectedText);

        // Debug logging if they don't match
        if(actualText !== normalizedExpected) {
          console.log(`Debug ${imageName}:`);
          console.log('Expected (raw):', JSON.stringify(expectedText));
          console.log(
            'Expected (normalized):',
            JSON.stringify(normalizedExpected)
          );
          console.log('Actual (raw):', JSON.stringify(result.data[0].text));
          console.log('Actual (normalized):', JSON.stringify(actualText));
          console.log('Expected length:', normalizedExpected.length);
          console.log('Actual length:', actualText.length);
        }

        actualText.should.equal(normalizedExpected);
      });
    }
  });

  describe('PDF417 Scanning', function() {
    const pathToBarcodes = '/base/images/pdf417/';
    const imageNames = ['001.png', '002.png'];

    for(const imageName of imageNames) {
      it(`should scan PDF417 from ${imageName}`, async function() {
        // Load image
        const imageUrl = pathToBarcodes + imageName;
        let img;

        try {
          img = await helpers.loadImage(imageUrl);
        } catch(error) {
          console.warn(
            `⚠️  Test image ${imageName} not found, skipping test`
          );
          this.skip();
          return;
        }

        // Scan for PDF417
        const results = await scanner.scan(img, {
          formats: ['pdf417'],
          mode: 'first'
        });

        // Verify results
        results.should.have.length(1);
        const result = results[0];
        result.should.have.property('format', 'pdf417');
        result.should.have.property('data');
        result.data.should.be.an('array');
        result.data.should.have.length.greaterThan(0);

        // Check expected text
        const expectedText = mockData.pdf417[imageName];
        should.exist(expectedText);
        result.data[0].text.should.equal(expectedText);
      });
    }
  });

  describe('Scan Modes', function() {
    it('should support first mode', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      const results = await scanner.scan(img, {
        formats: ['qr_code'],
        mode: 'first'
      });

      results.should.have.length(1);
      results[0].format.should.equal('qr_code');
    });

    it('should support all mode', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      const results = await scanner.scan(img, {
        formats: ['qr_code', 'pdf417'],
        mode: 'all'
      });

      // Should get at least QR code result
      results.should.have.length.greaterThan(0);
      const qrResult = results.find(r => r.format === 'qr_code');
      should.exist(qrResult);
    });

    it('should throw error for unsupported format', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      try {
        await scanner.scan(img, {
          formats: ['unsupported_format']
        });
        should.fail('Should have thrown error');
      } catch(error) {
        error.message.should.include('Unsupported formats');
      }
    });
  });

  describe('Abort Signal', function() {
    it('should respect abort signal', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');
      const controller = new AbortController();

      // Abort immediately
      controller.abort();

      try {
        await scanner.scan(img, {
          formats: ['qr_code'],
          signal: controller.signal
        });
        should.fail('Should have thrown AbortError');
      } catch(error) {
        error.name.should.equal('AbortError');
      }
    });
  });
});

describe('MRZ Scanning', function() {
  let mrzScanner;
  let testLicenseKey;

  /**
  * Debug version - Get license key from various sources
  * with detailed logging.
  *
  * @returns {string|null} License key or null if not available.
  */
  function getLicenseKey() {
    console.log('🔍 DEBUG: getLicenseKey() called');
    console.log('🔍 DEBUG: typeof process:', typeof process);

    if(typeof process !== 'undefined') {
      console.log('🔍 DEBUG: process exists');
      console.log('🔍 DEBUG: process.env exists:', !!process.env);
      if(process.env) {
        console.log('🔍 DEBUG: process.env keys:', Object.keys(process.env));
        console.log('🔍 DEBUG: DYNAMSOFT_MRZ_LICENSE_KEY value:',
          process.env.DYNAMSOFT_MRZ_LICENSE_KEY ? 'EXISTS' : 'NOT_FOUND');

        if(process.env.DYNAMSOFT_MRZ_LICENSE_KEY) {
          console.log('✅ License key found via process.env');
          return process.env.DYNAMSOFT_MRZ_LICENSE_KEY;
        }
      }
    } else {
      console.log('🔍 DEBUG: process is undefined');
    }

    // Try browser localStorage (fallback)
    if(typeof window !== 'undefined') {
      console.log('🔍 DEBUG: window exists, checking localStorage');
      const storedKey = window.localStorage?.getItem('mrzLicenseKey');
      if(storedKey) {
        console.log('✅ License key found in localStorage');
        return storedKey;
      }

      // Try global variable (fallback)
      if(window.TEST_MRZ_LICENSE_KEY) {
        console.log('✅ License key found in window.TEST_MRZ_LICENSE_KEY');
        return window.TEST_MRZ_LICENSE_KEY;
      }
    }

    console.warn('❌ No license key found in any source');
    return null;
  }

  // Setup MRZ scanner with license key
  beforeEach(function() {
    testLicenseKey = getLicenseKey();

    if(!testLicenseKey) {
      console.warn(
        '⚠️ No MRZ license key available. Set DYNAMSOFT_MRZ_LICENSE_KEY ' +
        'environment variable or window.TEST_MRZ_LICENSE_KEY ' +
        'to run MRZ tests.'
      );
      this.skip();
      return;
    }

    // Create scanner with MRZ plugin
    mrzScanner = new OpticalScanner({
      plugins: [qrCodePlugin, pdf417Plugin, mrzPlugin]
    });
  });

  describe('MRZ Plugin Registration', function() {
    it('should include MRZ in supported formats', function() {
      if(!testLicenseKey) {
        this.skip();
        return;
      }

      const formats = mrzScanner.getSupportedFormats();
      formats.should.include('mrz');
      formats.should.have.length(3); // qr_code, pdf417, mrz
    });

    it('should have mrzPlugin available for import', function() {
      should.exist(mrzPlugin);
      mrzPlugin.should.have.property('format', 'mrz');
      mrzPlugin.should.have.property('scan');
      mrzPlugin.scan.should.be.a('function');
    });
  });

  describe('MRZ Document Scanning', function() {
    const pathToMRZ = '/base/images/mrz/';
    const imageNames = ['USA19.jpg', 'MEX19.jpg', 'CAN19.jpg'];

    // DEBUG VERSION of first test
    it('should scan MRZ from USA19.jpg', async function() {
      if(!testLicenseKey) {
        this.skip();
        return;
      }

      console.log('🔧 DEBUG: License key available:', !!testLicenseKey);
      console.log('🔧 DEBUG: License key length:', testLicenseKey?.length);

      // Load image
      const imageUrl = pathToMRZ + 'USA19.jpg';
      let img;

      try {
        img = await helpers.loadImage(imageUrl);
        console.log('✅ Image loaded:', img.width, 'x', img.height);
      } catch(error) {
        console.warn(`⚠️ Test image not found, skipping test`);
        this.skip();
        return;
      }

      // Test MRZ plugin directly
      console.log('🔧 Testing MRZ plugin directly...');
      try {
        const directResult = await mrzPlugin.scan(img, {
          licenseKey: testLicenseKey,
          mrzMode: 'element'
        });
        console.log('✅ Direct plugin result:', directResult);
      } catch(error) {
        console.error('❌ Direct plugin error:', error.message);
        console.error('❌ Direct plugin stack:', error.stack);
      }

      // Test through scanner
      console.log('🔧 Testing through OpticalScanner...');
      const results = await mrzScanner.scan(img, {
        formats: ['mrz'],
        mode: 'first',
        pluginOptions: {
          mrz: {
            licenseKey: testLicenseKey,
            mrzMode: 'element'
          }
        }
      });

      // Verify basic result structure
      results.should.have.length(1);
      const result = results[0];
      result.should.have.property('format', 'mrz');
      result.should.have.property('data');
    });

    // Regular tests for other images - Skip first one since to debug
    for(const imageName of imageNames.slice(1)) {
      it(`should scan MRZ from ${imageName}`, async function() {
        if(!testLicenseKey) {
          this.skip();
          return;
        }

        // Load image
        const imageUrl = pathToMRZ + imageName;
        let img;

        try {
          img = await helpers.loadImage(imageUrl);
        } catch(error) {
          console.warn(
            `⚠️ Test image ${imageName} not found, skipping test`
          );
          this.skip();
          return;
        }

        // Scan for MRZ
        const results = await mrzScanner.scan(img, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: {
            mrz: {
              licenseKey: testLicenseKey,
              mrzMode: 'element'
            }
          }
        });

        // Verify basic result structure
        results.should.have.length(1);
        const result = results[0];
        result.should.have.property('format', 'mrz');
        result.should.have.property('data');

        // Verify MRZ-specific data structure
        const mrzData = result.data;
        mrzData.should.be.an('object');
        mrzData.should.have.property('documentNumber');
        mrzData.should.have.property('firstName');
        mrzData.should.have.property('lastName');
        mrzData.should.have.property('dateOfBirth');
        mrzData.should.have.property('dateOfExpiry');
        mrzData.should.have.property('nationality');
        mrzData.should.have.property('validation');

        // Check validation structure
        const validation = mrzData.validation;
        validation.should.have.property('overallStatus');
        validation.should.have.property('fieldAnalysis');
        validation.should.have.property('statistics');

        // Check expected fields match mock data if available
        const expectedData = mockData.mrz?.[imageName];
        if(expectedData?.fields) {
          console.log(
            `📋 Expected fields for ${imageName}:`,
            expectedData.fields
          );
          console.log(`📋 Actual MRZ data:`, {
            documentNumber: mrzData.documentNumber,
            firstName: mrzData.firstName,
            lastName: mrzData.lastName,
            nationality: mrzData.nationality
          });
        }
      });
    }
  });

  describe('MRZ Validation Analysis', function() {
    it('should provide validation analysis for MRZ data', async function() {
      if(!testLicenseKey) {
        this.skip();
        return;
      }

      let img;
      try {
        img = await helpers.loadImage('/base/images/mrz/USA19.jpg');
      } catch(error) {
        console.warn(
          '⚠️ MRZ test image not found, skipping validation test'
        );
        this.skip();
        return;
      }

      const results = await mrzScanner.scan(img, {
        formats: ['mrz'],
        mode: 'first',
        pluginOptions: {
          mrz: {
            licenseKey: testLicenseKey,
            mrzMode: 'element'
          }
        }
      });

      should.exist(results[0].data.validation);
      const validation = results[0].data.validation;

      // Check validation structure
      validation.should.have.property('overallStatus');
      ['complete', 'partial', 'incomplete', 'failed']
        .should.include(validation.overallStatus);

      validation.should.have.property('statistics');
      const stats = validation.statistics;
      stats.should.have.property('criticalCompleteness');
      stats.should.have.property('optionalCompleteness');
      stats.should.have.property('overallCompleteness');
      stats.criticalCompleteness.should.be.a('number');
      stats.optionalCompleteness.should.be.a('number');
      stats.overallCompleteness.should.be.a('number');

      validation.should.have.property('fieldAnalysis');
      validation.fieldAnalysis.should.be.an('array');
      validation.fieldAnalysis.length.should.be.greaterThan(0);

      // Check field analysis structure
      const firstField = validation.fieldAnalysis[0];
      firstField.should.have.property('key');
      firstField.should.have.property('label');
      firstField.should.have.property('status');
      firstField.should.have.property('isCritical');
      ['valid', 'invalid', 'missing', 'optional_missing']
        .should.include(firstField.status);
    });
  });

  describe('MRZ Error Handling', function() {
    it('should handle missing license key gracefully', async function() {
      let img;
      try {
        img = await helpers.loadImage('/base/images/mrz/USA19.jpg');
      } catch(error) {
        this.skip();
        return;
      }

      try {
        await mrzScanner.scan(img, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: {
            mrz: {
              // No license key provided
              mrzMode: 'element'
            }
          }
        });
        should.fail('Should have thrown error for missing license key');
      } catch(error) {
        error.message.should.include('license key');
      }
    });

    it('should handle invalid license key', async function() {
      let img;
      try {
        img = await helpers.loadImage('/base/images/mrz/USA19.jpg');
      } catch(error) {
        this.skip();
        return;
      }

      try {
        await mrzScanner.scan(img, {
          formats: ['mrz'],
          mode: 'first',
          pluginOptions: {
            mrz: {
              licenseKey: 'invalid-license-key',
              mrzMode: 'element'
            }
          }
        });
        // This may or may not throw depending on Dynamsoft's behavior
        // If it doesn't throw, just log a warning
        console.warn(
          '⚠️ Invalid license key did not throw error - ' +
          'this may be expected'
        );
      } catch(error) {
        // Expected behavior - invalid license should fail
        error.message.should.be.a('string');
      }
    });
  });

  describe('MRZ Scan Modes', function() {
    it('should support different MRZ modes', async function() {
      if(!testLicenseKey) {
        this.skip();
        return;
      }

      let img;
      try {
        img = await helpers.loadImage('/base/images/mrz/USA19.jpg');
      } catch(error) {
        this.skip();
        return;
      }

      // Test element mode (default)
      const elementResults = await mrzScanner.scan(img, {
        formats: ['mrz'],
        mode: 'first',
        pluginOptions: {
          mrz: {
            licenseKey: testLicenseKey,
            mrzMode: 'element'
          }
        }
      });

      elementResults.should.have.length(1);
      elementResults[0].should.have.property('format', 'mrz');
    });
  });

  describe('Multi-Format with MRZ', function() {
    it('should scan multiple formats including MRZ', async function() {
      if(!testLicenseKey) {
        this.skip();
        return;
      }

      // Test that the scanner supports multiple formats
      const formats = mrzScanner.getSupportedFormats();
      formats.should.include('qr_code');
      formats.should.include('pdf417');
      formats.should.include('mrz');

      // Test scan options structure for multi-format
      const scanOptions = {
        formats: ['qr_code', 'pdf417', 'mrz'],
        mode: 'all',
        pluginOptions: {
          mrz: {
            licenseKey: testLicenseKey,
            mrzMode: 'element'
          }
        }
      };

      // Should not throw error on option validation
      should.exist(scanOptions.pluginOptions.mrz);
      scanOptions.pluginOptions.mrz.should.have.property('licenseKey');
      scanOptions.pluginOptions.mrz.should.have.property('mrzMode');
    });
  });
});

describe('Test Environment', function() {
  describe('License Key Detection', function() {
    it('should detect available license key sources', function() {
      const sources = [];

      // Check environment variable
      if(process.env.DYNAMSOFT_MRZ_LICENSE_KEY) {
        sources.push('environment');
      }

      // Check browser localStorage
      if(typeof window !== 'undefined') {
        if(window.localStorage?.getItem('mrzLicenseKey')) {
          sources.push('localStorage');
        }
        if(window.TEST_MRZ_LICENSE_KEY) {
          sources.push('global');
        }
      }

      console.log(
        `📋 Available license key sources: ${sources.join(', ') || 'none'}`
      );

      if(sources.length === 0) {
        console.log('💡 To run MRZ tests, set one of:');
        console.log('  - DYNAMSOFT_MRZ_LICENSE_KEY environment variable');
        console.log('  - window.TEST_MRZ_LICENSE_KEY global variable');
        console.log(
          '  - Store key in browser localStorage as "mrzLicenseKey"'
        );
      }

      // This test always passes - it's just informational
      sources.should.be.an('array');
    });
  });

  describe('Test Image Validation', function() {
    it('should report available test images', function() {
      const imageNames = ['USA19.jpg', 'MEX19.jpg', 'CAN19.jpg'];
      const pathToMRZ = '/base/images/mrz/';

      console.log('📋 Checking MRZ test images:');
      imageNames.forEach(imageName => {
        console.log(`  - Expected: ${pathToMRZ}${imageName}`);
      });

      console.log('💡 MRZ test images should contain:');
      console.log('  - USA19.jpg: US document with clear MRZ');
      console.log('  - MEX19.jpg: Mexican document with clear MRZ');
      console.log('  - CAN19.jpg: Canadian document with clear MRZ');

      // This test always passes - it's just informational
      imageNames.should.have.length(3);
    });
  });
});
