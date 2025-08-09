// classCatch - Background Service Worker

// Default settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    enabled: true,
    mode: "auto",
    theme: "dark",
    status: "free",
    plan: "free",
    productPermalink: "",
    licenseKey: "",
    pageQuota: 3,
    usedPages: []
  });
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VERIFY_LICENSE") {
    verifyLicense(message.licenseKey, message.productPermalink)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.type === "GET_STATUS") {
    getStatus()
      .then(status => sendResponse(status))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.type === "CHECK_AND_CONSUME_PAGE") {
    checkAndConsumePage(message.pageKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ allowed: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.type === "GET_QUOTA") {
    getQuota()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.type === "RESET_QUOTA") {
    resetQuota()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

// Verify license with Gumroad API
const GUMROAD_PRODUCT_ID = '33phVx766ebEl_LxrwVEbA==';
async function verifyLicense(licenseKey, productPermalink) {
  if (!licenseKey || !productPermalink) {
    return { success: false, error: "License key and product permalink are required" };
  }
  
  try {
    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        license_key: licenseKey,
        // Gumroad now requires product_id for certain products; include both for compatibility
        product_id: GUMROAD_PRODUCT_ID,
        product_permalink: productPermalink
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Single paid tier: Forever (unlimited pages)
      const plan = "forever";
      const pageQuota = Infinity;
      
      // Store license info and update status
      await chrome.storage.sync.set({
        status: "pro",
        plan: plan,
        pageQuota: pageQuota,
        licenseKey: licenseKey,
        productPermalink: productPermalink
      });
      
      return { success: true, status: "pro", plan: plan, pageQuota: pageQuota };
    } else {
      return { success: false, error: data.message || "Invalid license" };
    }
  } catch (error) {
    console.error("License verification error:", error);
    return { success: false, error: "Failed to verify license. Please try again." };
  }
}

// Get current status
async function getStatus() {
  try {
    const data = await chrome.storage.sync.get([
      "status", "plan", "pageQuota", "usedPages"
    ]);
    
    const result = {
      status: data.status || "free",
      plan: data.plan || "free",
      pageQuota: data.pageQuota || 3,
      usedPages: data.usedPages || []
    };
    
    console.log('Background: getStatus result:', result);
    return result;
  } catch (error) {
    console.error("Error getting status:", error);
    throw new Error("Failed to get status");
  }
}

// Check and consume page quota
async function checkAndConsumePage(pageKey) {
  try {
    console.log('Background: Checking quota for page:', pageKey);
    
    if (!pageKey) {
      return { allowed: false, error: "Page key is required" };
    }
    
    // Normalize key: key = (origin + pathname).replace(/\/+$/,"").toLowerCase()
    const normalizedKey = pageKey.replace(/\/+$/, "").toLowerCase();
    
    const data = await getStatus();
    console.log('Background: Current status data:', data);
    
    // If user is on pro plan or has infinite quota, always allow
    if (data.plan === "pro" || data.pageQuota === Infinity) {
      console.log('Background: Pro plan or infinite quota, allowing');
      return { allowed: true, remaining: Infinity };
    }
    
    // If page already consumed, allow without incrementing
    if (data.usedPages.includes(normalizedKey)) {
      console.log('Background: Page already consumed, allowing without increment');
      return { 
        allowed: true, 
        remaining: data.pageQuota - data.usedPages.length
      };
    }
    
    // If quota is reached, block
    if (data.usedPages.length >= data.pageQuota) {
      console.log('Background: Quota reached, blocking');
      return { 
        allowed: false, 
        remaining: 0,
        message: "Free plan page limit reached. Verify license to unlock more pages."
      };
    }
    
    // Add page to used pages
    const updatedUsedPages = [...data.usedPages, normalizedKey];
    console.log('Background: Adding page to used pages:', normalizedKey);
    console.log('Background: Updated used pages:', updatedUsedPages);
    
    await chrome.storage.sync.set({
      usedPages: updatedUsedPages
    });
    
    // Log for debugging
    console.log("Background: Page quota updated:", {
      normalizedKey,
      usedPages: updatedUsedPages,
      pageQuota: data.pageQuota,
      remaining: data.pageQuota - updatedUsedPages.length
    });
    
    return { 
      allowed: true,
      remaining: data.pageQuota - updatedUsedPages.length
    };
  } catch (error) {
    console.error("Error checking page quota:", error);
    throw new Error("Failed to check page quota");
  }
}

// Get quota information
async function getQuota() {
  try {
    const data = await getStatus();
    
    const remaining = (data.plan === "forever" || data.pageQuota === Infinity) ? 
      Infinity : 
      data.pageQuota - data.usedPages.length;
    
    return {
      plan: data.plan === "pro" ? "forever" : data.plan,
      used: data.usedPages.length,
      pageQuota: data.pageQuota,
      remaining: remaining
    };
  } catch (error) {
    console.error("Error getting quota:", error);
    throw new Error("Failed to get quota information");
  }
}
