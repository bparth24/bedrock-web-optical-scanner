# bedrock-web-optical-scanner

Framework-agnostic optical scanner library for Bedrock apps. Supports QR code, PDF417 barcode, and MRZ (Machine Readable Zone) scanning via plugin architecture.

---

## 1. Project Overview

This project is a browser-based optical scanner library, supporting QR code, PDF417 barcode, and MRZ document formats. It provides a plugin-based API for optical code detection and decoding, and includes a manual test UI for browser-based testing.

**Supported Formats:**

- **QR Codes** - Quick Response codes using BarcodeDetector API
- **PDF417** - PDF417 barcodes using BarcodeDetector API  
- **MRZ** - Machine Readable Zone (passports, ID cards) using Dynamsoft MRZ Scanner

---

## 2. Key Technologies

- JavaScript (ES Modules)
- Webpack: Bundles code for browser use (UMD format)
- barcode-detector: Used as a ponyfill for QR/PDF417 detection
- dynamsoft-mrz-scanner: Used for MRZ document scanning
- Plugin Architecture: Extensible for new optical formats

---

## 3. Directory & File Structure

```
lib/
  optical-scanner.js         // Main scanner class
  plugins/
    index.js                 // Plugin registration
    pdf417Plugin.js          // PDF417 plugin
    qrCodePlugin.js          // QR code plugin
    mrzPlugin.js             // MRZ scanning plugin
  utils/
    camera.js                // Camera utilities

scripts/
  validate-basic.js          // Script for basic validation

test/
  helpers.js, mockData.js, setup-test-images.js, test.js, test.config.js
  images/                    // Test images for QR, PDF417, and MRZ
    qr_code/                 // QR code test images
    pdf417/                  // PDF417 test images  
    mrz/                     // MRZ document test images
  web/                       // Web test helpers
    10-api.js                // Main API tests (includes MRZ tests)

manual-test.html             // Browser UI for manual testing
index.js                     // Main entry, exports, and browser test logic
webpack.config.js            // Webpack config for bundling
package.json                 // Project metadata and dependencies
README.md, MANUAL_TESTING.md // Documentation
```

---

## 4. Main Components

### `lib/optical-scanner.js`

- Exports the `OpticalScanner` class.
- Handles scanning images/files for optical codes using registered plugins.
- Accepts plugins for different optical formats.

### `lib/plugins/`

- `qrCodePlugin.js` & `pdf417Plugin.js`: Implement detection/decoding for barcode formats using BarcodeDetector API.
- `mrzPlugin.js`: Implements MRZ scanning using Dynamsoft MRZ Scanner with validation analysis.
- `index.js`: Exports plugin registration helpers and all plugins.

### `lib/utils/camera.js`

- Camera-related utilities (e.g., starting/stopping streams, capturing frames).

### `index.js`

- Exports core classes and plugins for use in Node and browser.
- Manual test logic for browser:
  - Initializes the scanner using UMD bundle exports (`window.OpticalScannerLib`).
  - Sets up UI event listeners for camera and file scanning.
  - Displays results and status in the UI.
  - Handles MRZ license key management.

### `manual-test.html`

- UI for manual browser testing.
- Loads the Webpack bundle (`dist/bundle.js`).
- Provides controls for camera and file scanning for all supported formats.
- Includes MRZ-specific UI with license key input and validation display.
- Displays results, supported formats, and debug info.

### `webpack.config.js`

- Configures Webpack to bundle the library for browser use.
- Outputs a UMD bundle exposing all exports under `window.OpticalScannerLib`.

---

## 5. How Browser Manual Testing Works

- The browser loads `manual-test.html`, which loads the UMD bundle.
- The bundle exposes all exports under `window.OpticalScannerLib`.
- The manual test logic in `index.js`:
  - Instantiates scanners with plugins from `window.OpticalScannerLib`.
  - Sets up event listeners for camera start/stop, scan frame, and file upload.
  - Handles MRZ license key validation and storage.
  - Scans images from camera or file, and displays results in the UI.
  - Shows MRZ validation analysis with field completeness scoring.

---

## 6. Plugin Architecture

- Plugins are registered with the scanner to support different optical formats.
- Each plugin implements detection and decoding logic for its format.
- The scanner can be extended with new plugins for additional formats.
- **MRZ Plugin**: Requires Dynamsoft license key and supports camera, file, and element scanning modes.

---

## 7. Testing & Validation

### Automated Tests

- Located in the `test/` directory, using sample images and helpers.
- Includes comprehensive test coverage for QR, PDF417, and MRZ formats.
- MRZ tests include validation analysis, error handling, and multi-format integration.

### Manual Browser Testing

- Use `manual-test.html` to test scanning via camera or file upload.
- See the full guide in [MANUAL_TESTING.md](./MANUAL_TESTING.md).

### Test Images Required

- **QR Codes**: `test/images/qr_code/001.gif`, `002.png`
- **PDF417**: `test/images/pdf417/001.png`, `002.png`  
- **MRZ**: `test/images/mrz/USA19.jpg`, `MEX19.jpg`, `CAN19.jpg`

---

## 8. Build & Usage

### Prerequisites

For MRZ scanning functionality, you need:

1. **Dynamsoft MRZ Scanner License Key**
   - Get a free trial: https://www.dynamsoft.com/customer/license/trialLicense?product=mrz
   - Set environment variable: `DYNAMSOFT_MRZ_LICENSE_KEY=your-key`

2. **Dependencies**

   ```bash
   npm install dynamsoft-mrz-scanner
   ```

### Build for browser

```bash
npm run build
```

### Manual test

```bash
# Set license key for MRZ testing
export DYNAMSOFT_MRZ_LICENSE_KEY="your-license-key-here"

# Build the project
npm run build

# Serve the test page
python3 -m http.server 8000
# or
npx serve .

# Open browser
open http://localhost:8000/manual-test.html
```

### Automated tests

```bash
# Run all tests
npm test

# Run with MRZ license key
DYNAMSOFT_MRZ_LICENSE_KEY="your-key" npm test
```

### Basic Usage Example

```javascript
import { OpticalScanner, qrCodePlugin, pdf417Plugin, mrzPlugin } from '@bedrock/web-optical-scanner';

// Create scanner with all plugins
const scanner = new OpticalScanner({
  plugins: [qrCodePlugin, pdf417Plugin, mrzPlugin]
});

// Scan QR codes and barcodes
const barcodeResults = await scanner.scan(imageElement, {
  formats: ['qr_code', 'pdf417', 'mrz'],
  mode: 'all'
});

// Scan MRZ documents (requires license key)
const mrzResults = await scanner.scan(passportImage, {
  formats: ['mrz'],
  mode: 'first',
  pluginOptions: {
    mrz: {
      licenseKey: 'your-dynamsoft-license-key',
      mrzMode: 'element'
    }
  }
});

console.log('MRZ Data:', mrzResults[0].data);
console.log('Validation:', mrzResults[0].data.validation);
```

---

## 9. MRZ (Machine Readable Zone) Features

### Supported Documents

- **Passports** - Machine readable zones on passport pages
- **ID Cards** - National ID cards with MRZ
- **Driver Licenses** - Licenses with machine readable zones
- **Visas** - Travel visas with MRZ data

### MRZ Data Extraction

- Document number, names, dates, nationality
- Document type and issuing state
- Gender and age information
- Raw MRZ text preservation

### Validation Analysis

- **Field Completeness**: Critical vs optional field analysis
- **Validation Scoring**: Overall completeness percentages  
- **Status Determination**: Complete, partial, incomplete, or failed
- **Error Detection**: Invalid field identification

### Scanning Modes

- **Camera Mode**: Full-screen camera scanner with Dynamsoft UI
- **File Mode**: Upload and scan document images
- **Element Mode**: Scan from existing image/video elements

---

## 10. Environment Setup

### License Key Configuration

Choose one of these methods:

#### Option A: Environment Variable

```bash
export DYNAMSOFT_MRZ_LICENSE_KEY="your-license-key-here"
```

#### Option B: .env File

```bash
echo "DYNAMSOFT_MRZ_LICENSE_KEY=your-license-key-here" >> .env
```

#### Option C: Browser localStorage

```javascript
localStorage.setItem('mrzLicenseKey', 'your-license-key-here');
```

### Test Environment Setup

```bash
# Set up test directories and check images
node test/setup-test-images.js

```

---

## 11. Troubleshooting

### Common Issues

#### QR/PDF417 Issues

- If you see import errors, check that all plugin exports are present.
- If scanning returns empty data, ensure the barcode is clear and supported.
- For Webpack/browser issues, clear `node_modules` and reinstall.

#### MRZ Issues

- **"MRZ scanning requires a valid Dynamsoft license key"**
  - Set `DYNAMSOFT_MRZ_LICENSE_KEY` environment variable
  - Get free trial key from Dynamsoft website
  
- **"No MRZ detected"**
  - Ensure document image shows clear MRZ text at bottom
  - Check image quality - avoid shadows, glare, or skew
  - Verify document type is supported (passport, ID card, etc.)

- **License Key Problems**
  - Verify key is not expired
  - Check key format (should be long base64-like string)
  - Ensure key is for MRZ product, not other Dynamsoft products

#### Camera Issues

- Camera not showing: Add `autoplay playsinline muted` to video element
- Permission denied: Ensure HTTPS or localhost for camera access
- Poor scanning: Use rear camera with `facingMode: 'environment'`

#### Test Issues

- Missing test images: Run `node test/setup-test-images.js`
- Tests skipped: Check license key availability in environment
- Build errors: Ensure all dependencies installed (`npm install`)

---

## 12. Contributing

See [the contribute file](https://github.com/digitalbazaar/bedrock/blob/master/CONTRIBUTING.md)!

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

### Adding New Plugins

1. Create plugin file in `lib/plugins/newPlugin.js`
2. Follow existing plugin interface (`format` and `scan` properties)
3. Export plugin in `lib/plugins/index.js`
4. Add tests following existing patterns
5. Update documentation

---

## 13. Commercial Support

TBD

---

## 14. License

TBD
