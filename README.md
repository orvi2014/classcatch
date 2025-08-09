# classCatch - Tailwind Copy & CSS Converter

classCatch is a Chrome extension that lets you hover over any element on a webpage to view and copy its Tailwind CSS classes. If the element doesn't use Tailwind, classCatch will extract the computed CSS and provide a best-effort conversion to Tailwind classes.

## Features

- **Tailwind Detection**: Automatically detects if an element uses Tailwind CSS
- **Class Extraction**: View and copy Tailwind classes from elements
- **CSS Conversion**: Convert regular CSS to equivalent Tailwind classes
- **Multiple Modes**: Auto, Tailwind-only, CSS-only, or Always Convert
- **Theme Options**: Choose between dark and light themes
- **Free & Pro Tiers**: Basic functionality with daily limits, or unlimited usage with Pro

## Installation

### Load Unpacked (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `classCatch` directory
5. The extension should now be installed and visible in your toolbar

### Test with Test Bench

1. After installing the extension, open the `test-bench.html` file in Chrome
2. Hover over different elements to see classCatch in action
3. Test the different modes and features

## Usage

1. Click the classCatch icon in your toolbar to open the popup
2. Configure your preferences (enabled/disabled, theme, mode)
3. Browse any website and hover over elements to see the classCatch overlay
4. View Tailwind classes or converted CSS in the tooltip
5. Click the copy buttons to copy classes to your clipboard

## Free vs. Pro

### Free Tier

- 10 copies per day
- All core features included

### Pro Tier

- Unlimited copies
- Priority support
- Support future development

## Gumroad Setup

### For Users

1. Purchase classCatch Pro from our [Gumroad page](#)
2. You'll receive a license key via email
3. Open the classCatch popup and enter your license key and the product permalink
4. Click "Verify License" to unlock Pro features

### For Developers

1. Create a product on Gumroad
2. Get your product permalink (the part after gumroad.com/l/ in your product URL)
3. Update the GitHub link and Gumroad link in the extension files
4. Test license verification with your own license key

## Chrome Web Store Submission

1. Create a ZIP file of the `classCatch` directory
2. Create a developer account on the [Chrome Web Store](https://chrome.google.com/webstore/devconsole/)
3. Pay the one-time developer fee ($5 USD)
4. Create a new item and upload your ZIP file
5. Fill in all required information, including:
   - Description
   - Screenshots
   - Privacy policy
   - Store listing details
6. Submit for review

## Privacy Note

classCatch does not collect any analytics or user data. The only external API call made is to Gumroad's license verification API when verifying a Pro license.

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `background.js`: Service worker for license verification and usage tracking
- `content.js`: Core functionality for element analysis and UI
- `content.css`: Styles for overlay and tooltip
- `popup.html/js`: Settings UI and license verification
- `options.html`: Additional options page
- `test-bench.html`: Test page for development
- `icons/`: Extension icons

### Technologies Used

- Manifest V3 Chrome Extension API
- Vanilla JavaScript (no bundler or framework)
- Tailwind CSS detection and conversion logic
- Gumroad License Verification API

## License

MIT