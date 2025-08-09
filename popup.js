// classCatch - Popup Script

// Check if extension context is available
const isExtensionContextValid = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
};

// DOM elements
const enabledCheckbox = document.getElementById('enabled');
const themeSelect = document.getElementById('theme');
const modeSelect = document.getElementById('mode');
const productPermalinkInput = document.getElementById('product-permalink');
const licenseKeyInput = document.getElementById('license-key');
const verifyLicenseButton = document.getElementById('verify-license');
const statusBadge = document.getElementById('status-badge');
const statusMessage = document.getElementById('status-message');
const usageCounter = document.getElementById('usage-counter');
const DEFAULT_PERMALINK = 'classcatch';

// Load settings from storage
function loadSettings() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available');
    return;
  }
  
  try {
    chrome.storage.sync.get([
      'enabled',
      'theme',
      'mode',
      'status',
      'plan',
      'productPermalink',
      'licenseKey',
      'pageQuota',
      'usedPages'
    ], (result) => {
      if (chrome.runtime.lastError) {
        console.log('Extension context invalidated, using defaults');
        return;
      }
          // Set checkbox state
      if (result.enabled !== undefined) {
        enabledCheckbox.checked = result.enabled;
      }
      
      // Set select values
      if (result.theme) {
        themeSelect.value = result.theme;
      }
      
      if (result.mode) {
        modeSelect.value = result.mode;
      }
      
      // Set license inputs (guard if field is not present in UI)
      if (productPermalinkInput) {
        productPermalinkInput.value = result.productPermalink || DEFAULT_PERMALINK;
      }
      
      if (result.licenseKey) {
        licenseKeyInput.value = result.licenseKey;
      }
      
      // Update status badge
      updateStatusBadge(result.status || 'free', result.plan || 'free');
      
      // Update quota display
      const usedPages = result.usedPages || [];
      const pageQuota = result.pageQuota || 3;
      const plan = result.plan || 'free';
      updateQuotaDisplay(usedPages.length, pageQuota, plan);
    });
  } catch (error) {
    console.log('Extension context invalidated, using defaults');
  }
}

// Save settings to storage
function saveSettings() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available, cannot save settings');
    return;
  }
  
  const settings = {
    enabled: enabledCheckbox.checked,
    theme: themeSelect.value,
    mode: modeSelect.value
  };
  
  try {
    chrome.storage.sync.set(settings);
  } catch (error) {
    console.log('Extension context invalidated, cannot save settings');
  }
}

// Update status badge
function updateStatusBadge(status, plan) {
  if (status === 'pro' || plan === 'forever') {
    statusBadge.textContent = (plan === 'forever' ? 'FOREVER' : plan.toUpperCase());
    statusBadge.className = 'status-badge pro';
  } else {
    statusBadge.textContent = 'FREE';
    statusBadge.className = 'status-badge free';
  }
}

// Update quota display
function updateQuotaDisplay(usedPages, pageQuota, plan) {
  const remaining = plan === 'forever' || pageQuota === Infinity ? 
    Infinity : 
    pageQuota - usedPages;
  
  const displayQuota = remaining === Infinity ? 
    '∞' : 
    `${remaining}/${pageQuota}`;
  
  usageCounter.textContent = `Pages left: ${displayQuota}`;
}

// Verify license
async function verifyLicense() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    statusMessage.textContent = 'Extension context not available. Please refresh the page.';
    statusMessage.className = 'status-message error';
    return;
  }
  
  const productPermalink = productPermalinkInput
    ? (productPermalinkInput.value.trim() || DEFAULT_PERMALINK)
    : DEFAULT_PERMALINK;
  const licenseKey = licenseKeyInput.value.trim();
  
  // Validate inputs
  if (!productPermalink || !licenseKey) {
    statusMessage.textContent = 'Please enter both product permalink and license key';
    statusMessage.className = 'status-message error';
    return;
  }
  
  // Disable button and show loading state
  verifyLicenseButton.disabled = true;
  verifyLicenseButton.textContent = 'Verifying...';
  statusMessage.textContent = '';
  
  try {
    // Send message to background script
    const result = await chrome.runtime.sendMessage({
      type: 'VERIFY_LICENSE',
      productPermalink,
      licenseKey
    });
    
    // Check if extension context is still valid
    if (chrome.runtime.lastError) {
      statusMessage.textContent = 'Extension context invalidated. Please refresh the page.';
      statusMessage.className = 'status-message error';
      return;
    }
    
    // Handle result
    if (result.success) {
      statusMessage.textContent = 'License verified successfully!';
      statusMessage.className = 'status-message success';
      updateStatusBadge('pro', result.plan || 'pro');
      
      // Refresh quota display
      getStatus();
    } else {
      statusMessage.textContent = result.error || 'Failed to verify license';
      statusMessage.className = 'status-message error';
    }
  } catch (error) {
    statusMessage.textContent = 'Error verifying license. Please try again.';
    statusMessage.className = 'status-message error';
    console.error('License verification error:', error);
  } finally {
    // Reset button state
    verifyLicenseButton.disabled = false;
    verifyLicenseButton.textContent = 'Verify License';
  }
}

// Get current quota information
async function getStatus() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available');
    return;
  }
  
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_QUOTA' });
    
    // Check if extension context is still valid
    if (chrome.runtime.lastError) {
      console.log('Extension context invalidated');
      return;
    }
    
    if (result.error) {
      console.error('Error getting quota:', result.error);
      return;
    }
    
    // Get status to update badge
    const statusResult = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    // Check if extension context is still valid
    if (chrome.runtime.lastError) {
      console.log('Extension context invalidated');
      return;
    }
    
    if (statusResult.error) {
      console.error('Error getting status:', statusResult.error);
      return;
    }
    
    updateStatusBadge(statusResult.status, result.plan);
    updateQuotaDisplay(result.used, result.pageQuota, result.plan);
  } catch (error) {
    console.error('Error getting quota information:', error);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettings();
  
  // Get current status
  getStatus();
  
  // Add event listeners
  enabledCheckbox.addEventListener('change', saveSettings);
  themeSelect.addEventListener('change', saveSettings);
  modeSelect.addEventListener('change', saveSettings);
  verifyLicenseButton.addEventListener('click', verifyLicense);
});