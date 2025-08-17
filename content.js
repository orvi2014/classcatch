// ClassCatch - Content Script

// Track if extension has been disabled due to context invalidation
let extensionDisabled = false;

// Check if extension context is available
const isExtensionContextValid = () => {
  if (extensionDisabled) return false;
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
};

// Function to disable extension gracefully
const disableExtension = () => {
  extensionDisabled = true;
  console.log('Extension disabled due to context invalidation');
  
  // Remove any existing UI elements
  const existingOverlay = document.getElementById('classCatch-overlay');
  const existingTooltip = document.getElementById('classCatch-tooltip');
  
  // Remove scroll event listener if it exists
  if (existingOverlay && existingOverlay.updatePositionFunc) {
    try {
      window.removeEventListener('scroll', existingOverlay.updatePositionFunc);
      existingOverlay.updatePositionFunc = null;
    } catch (error) {
      console.log('Error removing scroll event listener:', error);
    }
  }
  
  if (existingOverlay) existingOverlay.remove();
  if (existingTooltip) existingTooltip.remove();
};

// === Helpers (add once) === 
const toHex = (rgb) => { 
  const m = rgb && rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); 
  if (!m) return null; 
  const h = n => Number(n).toString(16).padStart(2,'0'); 
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`; 
};

// --- Toast (remaining pages) --- 
function toastLeft(remaining) { 
  const t = document.createElement('div'); 
  t.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#111;color:#fff;border:1px solid #333;padding:8px 10px;border-radius:8px;font:12px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.3)'; 
  t.textContent = `${remaining} page${remaining===1?'':'s'} left on Free · Upgrade for more`; 
  document.body.appendChild(t); 
  setTimeout(()=>t.remove(), 2500); 
} 

// --- Upsell modal (block on quota) --- 
function showUpsell() { 
  const scrim = document.createElement('div'); 
  scrim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646'; 
  const box = document.createElement('div'); 
  box.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;z-index:2147483647'; 
  const card = document.createElement('div'); 
  card.style.cssText = 'width:360px;max-width:90vw;background:#0b0f14;color:#e5e7eb;border:1px solid #243445;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:16px;font:13px system-ui'; 
  card.innerHTML = ` 
    <div style="font-weight:600;font-size:14px;margin-bottom:6px">Free limit reached</div> 
    <div style="opacity:.85;margin-bottom:10px">You've used your 3 free pages. Unlock more to keep copying Tailwind classes and CSS→Tailwind.</div> 
    <ul style="margin:0 0 12px 16px;line-height:1.6"> 
      <li>🔓 Unlimited Pages</li> 
      <li>⚡ Works on any site (incl. iframes)</li> 
    </ul> 
    <div style="display:flex;gap:8px;justify-content:flex-end"> 
      <button id="cc-dismiss" style="padding:8px 10px;border:1px solid #334155;background:#0b0f14;border-radius:8px;color:#e5e7eb;cursor:pointer">Not now</button> 
      <button id="cc-havekey" style="padding:8px 10px;border:1px solid #334155;background:#111827;border-radius:8px;color:#e5e7eb;cursor:pointer">I have a key</button> 
      <button id="cc-upgrade" style="padding:8px 10px;border:1px solid #22d3ee;background:#06b6d4;border-radius:8px;color:#001014;font-weight:600;cursor:pointer">Unlock Unlimited</button> 
    </div>`; 
  box.appendChild(card); 
  document.body.append(scrim, box); 
  document.getElementById('cc-dismiss').onclick = () => { scrim.remove(); box.remove(); }; 
  document.getElementById('cc-havekey').onclick = () => { 
    scrim.remove(); 
    box.remove(); 
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.log('Extension context invalidated, cannot open options page');
    }
  }; 
  document.getElementById('cc-upgrade').onclick = () => { window.open('https://robatdas.gumroad.com/l/classcatch', '_blank'); }; 
}

// Get computed subset of styles
function getComputedSubset(element) {
  if (!element || !document.contains(element)) return {};
  
  // Define property groups
  const typographyProps = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align'];
  const colorProps = ['color', 'background-color', 'opacity'];
  const spacingProps = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap'];
  const layoutProps = ['display', 'position', 'z-index', 'overflow', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-content', 'column-gap', 'row-gap'];
  const sizeProps = ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio'];
  const borderProps = ['border-radius', 'border-width', 'border-style', 'border-color', 'box-shadow'];
  const transformProps = ['transform'];
  
  // Combine all properties
  const allProps = [
    ...typographyProps,
    ...colorProps,
    ...spacingProps,
    ...layoutProps,
    ...sizeProps,
    ...borderProps,
    ...transformProps
  ];
  
  // Get computed styles
  const computed = window.getComputedStyle(element);
  const result = {};
  
  // Extract values
  allProps.forEach(prop => {
    result[prop] = computed.getPropertyValue(prop);
  });
  
  return result;
} 
const pxStep = px => Math.round(parseFloat(px) / 4); // 4px base 
const twSpace = (prefix, px) => { 
  const n = pxStep(px); 
  return Number.isFinite(n) && n >= 0 ? `${prefix}-${n}` : `${prefix}-[${px}]`; 
}; 
const twSize = px => { 
  const n = Math.round(parseFloat(px)); 
  if (!Number.isFinite(n)) return ''; 
  if (n >= 24) return 'text-2xl'; 
  if (n >= 20) return 'text-xl'; 
  if (n >= 18) return 'text-lg'; 
  if (n >= 16) return 'text-base'; 
  if (n >= 14) return 'text-sm'; 
  return `text-[${n}px]`; 
}; 
const twColor = (kind, rgb) => { 
  const map = { 
    'rgb(59, 130, 246)': `${kind}-blue-500`, 
    'rgb(239, 68, 68)': `${kind}-red-500`, 
    'rgb(34, 197, 94)': `${kind}-green-500`, 
    'rgb(0, 0, 0)': `${kind}-black`, 
    'rgb(255, 255, 255)':`${kind}-white`, 
  }; 
  if (map[rgb]) return map[rgb]; 
  const hex = toHex(rgb); 
  return hex ? `${kind}-[${hex}]` : ''; 
};

// Convert CSS properties to Tailwind classes
function convertCssToTailwind(css) { 
  const tw = []; 

  // layout 
  if (css.display === 'flex') tw.push('flex'); 
  if (css.display === 'grid') tw.push('grid'); 
  const jc = { 'center':'justify-center','flex-start':'justify-start','flex-end':'justify-end','space-between':'justify-between','space-around':'justify-around' }; 
  if (css['justify-content'] && jc[css['justify-content']]) tw.push(jc[css['justify-content']]); 
  const ai = { 'center':'items-center','flex-start':'items-start','flex-end':'items-end','baseline':'items-baseline','stretch':'items-stretch' }; 
  if (css['align-items'] && ai[css['align-items']]) tw.push(ai[css['align-items']]); 
  if (css['flex-direction'] === 'column') tw.push('flex-col'); 
  if (css['flex-wrap'] === 'wrap') tw.push('flex-wrap'); 

  // spacing 
  ['top','right','bottom','left'].forEach(d => { 
    const p = css[`padding-${d}`]; if (p) tw.push(twSpace(`p${d[0]}`, p)); 
    const m = css[`margin-${d}`];  if (m) tw.push(twSpace(`m${d[0]}`, m)); 
  }); 
  if (css.gap) tw.push(twSpace('gap', css.gap)); 

  // size (arbitrary fallbacks) 
  if (css.width)            tw.push(`w-[${css.width}]`); 
  if (css.height)           tw.push(`h-[${css.height}]`); 
  if (css['min-width'])     tw.push(`min-w-[${css['min-width']}]`); 
  if (css['max-width'])     tw.push(`max-w-[${css['max-width']}]`); 
  if (css['min-height'])    tw.push(`min-h-[${css['min-height']}]`); 
  if (css['max-height'])    tw.push(`max-h-[${css['max-height']}]`); 
  if (css['aspect-ratio'])  tw.push(`aspect-[${css['aspect-ratio']}]`); 

  // typography 
  if (css['font-size'])     tw.push(twSize(css['font-size'])); 
  if (css['font-weight']) { 
    const w = parseInt(css['font-weight'],10); 
    const wm = {100:'font-thin',200:'font-extralight',300:'font-light',400:'font-normal',500:'font-medium',600:'font-semibold',700:'font-bold',800:'font-extrabold',900:'font-black'}; 
    tw.push(wm[w] || ''); 
  } 
  if (css['line-height']) { 
    const v = parseFloat(css['line-height']); 
    if (!isNaN(v)) tw.push(v>=1.75?'leading-8':v>=1.5?'leading-7':v>=1.25?'leading-6':`leading-[${css['line-height']}]`); 
  } 
  if (css['letter-spacing']) { 
    const num = parseFloat(css['letter-spacing']); 
    tw.push(Number.isFinite(num) ? (num>0?'tracking-wide':'tracking-tight') : `tracking-[${css['letter-spacing']}]`); 
  } 
  if (css['text-align']) tw.push({left:'text-left',center:'text-center',right:'text-right',justify:'text-justify'}[css['text-align']] || ''); 

  // colors/effects 
  if (css.color)               tw.push(twColor('text', css.color)); 
  if (css['background-color']) tw.push(twColor('bg', css['background-color'])); 
  if (css.opacity && css.opacity !== '1') tw.push(`opacity-[${css.opacity}]`); 

  // border/radius/shadow 
  if (css['border-radius']) { 
    const r = Math.round(parseFloat(css['border-radius'])/4); 
    tw.push(r>=6?'rounded-3xl':r>=4?'rounded-2xl':r>=3?'rounded-xl':r>=2?'rounded-lg':r>0?'rounded':`rounded-[${css['border-radius']}]`); 
  } 
  if (css['box-shadow'] && css['box-shadow'] !== 'none') tw.push('shadow'); 

  return tw.filter(Boolean).join(' ').trim(); 
}

// Gate page quota - check if user can copy on this page
async function gatePageQuota() {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available, allowing copy');
    return { allowed: true, remaining: Infinity };
  }
  
  // Get the current page key (origin + pathname)
  const pageKey = window.location.origin + window.location.pathname;
  
  // Normalize key as done in background.js
  const normalizedKey = pageKey.replace(/\/+$/, "").toLowerCase();
  
  // Send message to background script to check and consume quota
  try {
    console.log('Sending quota check message for page:', normalizedKey);
    const result = await chrome.runtime.sendMessage({
      type: 'CHECK_AND_CONSUME_PAGE',
      pageKey: normalizedKey
    });
    
    // Check if extension context is still valid
    if (chrome.runtime.lastError) {
      console.log('Extension context invalidated, allowing copy');
      return { allowed: true, remaining: Infinity };
    }
    
    // Log for debugging
    console.log('Page quota check:', {
      pageKey: normalizedKey,
      result,
      allowed: result.allowed,
      remaining: result.remaining
    });
    
    // If there's an error in the result, handle it
    if (result.error) {
      console.error('Error in quota check result:', result.error);
      return { 
        allowed: false, 
        message: result.message || 'Error checking quota: ' + result.error 
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error checking page quota:', error);
    return { allowed: true, remaining: Infinity };
  }
}

// Handle button click (copy to clipboard)
async function handleButtonClick(type, element, classes, css, buttonElement = null) {
  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available, allowing copy without quota check');
  } 
  
  // Determine what to copy based on type
  let textToCopy = '';
  
  if (type === 'tailwind') {
    // Copy Tailwind classes directly
    textToCopy = classes;
  } else if (type === 'converted') {
    // Copy converted Tailwind classes
    textToCopy = convertCssToTailwind(css);
  } else if (type === 'css') {
    // Copy raw CSS
    textToCopy = Object.entries(css)
      .map(([prop, value]) => `${prop}: ${value};`)
      .join('\n');
  }
  
  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(textToCopy);
    console.log(`Copied ${type} to clipboard:`, textToCopy);
    
    // Show visual feedback on button if provided
    if (buttonElement) {
      const originalText = buttonElement.textContent;
      const originalBackground = buttonElement.style.background;
      const originalBorderColor = buttonElement.style.borderColor;
      const originalColor = buttonElement.style.color;
      
      buttonElement.textContent = 'Copied!';
      buttonElement.style.background = '#10b981'; // Green background
      buttonElement.style.borderColor = '#10b981';
      buttonElement.style.color = '#ffffff'; // White text for visibility
      
      // Reset after 1.5 seconds
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.background = originalBackground;
        buttonElement.style.borderColor = originalBorderColor;
        buttonElement.style.color = originalColor;
      }, 1500);
    }
    
    // Show toast with remaining pages (only once per page)
    if (!toastShownForThisPage && isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({ type: 'GET_QUOTA' }, (r) => {
          if (chrome.runtime.lastError) {
            console.log('Extension context invalidated, skipping toast');
            return;
          }
          if (r && Number.isFinite(r.remaining) && r.remaining > 0) {
            toastLeft(r.remaining);
            toastShownForThisPage = true;
          }
        });
      } catch (error) {
        console.log('Extension context invalidated, skipping toast');
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Fallback copy method
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Show toast with remaining pages (only once per page)
    if (!toastShownForThisPage && isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({ type: 'GET_QUOTA' }, (r) => {
          if (chrome.runtime.lastError) {
            console.log('Extension context invalidated, skipping toast');
            return;
          }
          if (r && Number.isFinite(r.remaining) && r.remaining > 0) {
            toastLeft(r.remaining);
            toastShownForThisPage = true;
          }
        });
      } catch (error) {
        console.log('Extension context invalidated, skipping toast');
      }
    }
  }
}

// Track one toast per page
let toastShownForThisPage = false;
// Track page consumption (quota) once per page
let pageConsumedForThisPage = false;
let pageGateInProgress = false;
let pageGateBlocked = false;

// Initialize extension
(function() {
  // Global error handler to prevent crashes
  window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      console.log('Extension context invalidated, disabling extension gracefully');
      disableExtension();
      return false; // Prevent the error from being thrown
    }
  });

  // Check if extension context is valid
  if (!isExtensionContextValid()) {
    console.log('Extension context not available, using defaults');
    setupExtension('dark', 'auto');
    return;
  }
  
  // Check if device is mobile/touch - but allow extension to work
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  window.innerWidth <= 768 || 
                  'ontouchstart' in window;
  
  if (isMobile) {
    console.log('Mobile device detected, enabling mobile mode');
  }
  
  // Check if extension is enabled
  try {
    chrome.storage.sync.get(['enabled', 'theme', 'mode'], function(result) {
      if (chrome.runtime.lastError) {
        console.log('Extension context invalidated, using defaults');
        setupExtension('dark', 'auto');
        return;
      }
      
      if (result.enabled === false) {
        console.log('ClassCatch is disabled');
        return;
      }
      
      console.log('ClassCatch initialized with settings:', result);
      
      // Set up event listeners and UI elements
      setupExtension(result.theme || 'dark', result.mode || 'auto');
    });
  } catch (error) {
    console.log('Extension context invalidated, using defaults');
    setupExtension('dark', 'auto');
  }
  
  function setupExtension(theme, mode) {
    // Create overlay and tooltip elements
    const overlay = document.createElement('div');
    overlay.id = 'classCatch-overlay';
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.border = '2px solid rgba(56, 189, 248, 0.9)';
    overlay.style.boxShadow = '0 0 0 2px rgba(56,189,248,0.35), 0 8px 24px rgba(0,0,0,0.25)';
    overlay.style.borderRadius = '10px';
    overlay.style.background = 'transparent';
    overlay.style.transition = 'all 120ms ease';
    overlay.style.zIndex = '2147483646';
    document.body.appendChild(overlay);
    
    const tooltip = document.createElement('div');
    tooltip.id = 'classCatch-tooltip';
    tooltip.className = theme; // Apply theme
    tooltip.style.position = 'fixed';
    tooltip.style.maxWidth = 'min(92vw, 520px)';
    tooltip.style.padding = '10px 12px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.border = '1px solid rgba(148,163,184,0.25)';
    tooltip.style.background = 'rgba(15,23,42,0.96)';
    tooltip.style.color = '#e5e7eb';
    tooltip.style.boxShadow = '0 12px 34px rgba(0,0,0,0.35)';
    tooltip.style.font = '12.5px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"';
    tooltip.style.lineHeight = '1.45';
    tooltip.style.zIndex = '2147483647';
    document.body.appendChild(tooltip);
    
    // Hide tooltip initially
    tooltip.style.display = 'none';
    
    // Track current element
    let currentElement = null;

    // Shared overlay position updater so both desktop and mobile can call it
    function updateOverlayPosition() {
      // Guard rails
      if (extensionDisabled) return;
      if (!isExtensionContextValid()) { disableExtension(); return; }
      if (!currentElement || !document.contains(currentElement)) { hideUI(); return; }
      if (!overlay || !document.contains(overlay)) { hideUI(); return; }

      try {
        const rect = currentElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let left = rect.left + scrollX;
        let top = rect.top + scrollY;
        let width = rect.width;
        let height = rect.height;

        // Keep within viewport (mobile friendly)
        if (viewportWidth <= 768) {
          if (left < 0) left = 0;
          if (top < 0) top = 0;
          if (left + width > scrollX + viewportWidth) width = Math.max(0, scrollX + viewportWidth - left - 8);
          if (top + height > scrollY + viewportHeight) height = Math.max(0, scrollY + viewportHeight - top - 8);
        }

        overlay.style.left = left + 'px';
        overlay.style.top = top + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
      } catch (err) {
        console.log('updateOverlayPosition failed:', err);
        hideUI();
      }
    }
    
    // Mouse move handler (desktop)
    document.addEventListener('mousemove', function(e) {
      try {
        // Check if extension is disabled
        if (extensionDisabled) {
          return;
        }
        
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          console.log('Extension context invalidated during mouse move, disabling');
          disableExtension();
          return;
        }
        
        // Mobile detection for viewport handling
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.innerWidth <= 768 || 
                        'ontouchstart' in window;
        
        // Skip mouse events on mobile devices
        if (isMobile) {
          return;
        }
        
        // Get element under cursor
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // Skip if same element or our own UI elements
        if (element === currentElement || 
            element === overlay || 
            element === tooltip ||
            element?.closest('#classCatch-tooltip')) {
          return;
        }
        
        // Update current element
        currentElement = element;

        // PAGE-BASED GATING (one-time per page):
        // Start the gate and do not render UI until it resolves.
        if (!pageConsumedForThisPage && isExtensionContextValid()) {
          if (pageGateBlocked) return;
          if (!pageGateInProgress) {
            pageGateInProgress = true;
            gatePageQuota()
              .then(pageGate => {
                pageGateInProgress = false;
                if (!pageGate.allowed) {
                  pageGateBlocked = true;
                  showUpsell();
                } else {
                  pageConsumedForThisPage = true;
                }
              })
              .catch(err => {
                pageGateInProgress = false;
                console.log('Page gate check failed, allowing for resilience:', err);
                // allow UI in failure case to avoid dead-ends
                pageConsumedForThisPage = true;
              });
          }
          // While gating is pending or blocked, do not proceed to show UI
          return;
        }
        
        // Position overlay - now calls the shared function
        // (kept for backward compatibility with existing code paths)
        const updateOverlayPositionLocal = () => updateOverlayPosition();
        
        if (currentElement && document.contains(currentElement)) {
          // Get element properties
          let rect, computedCSS;
          try {
            // Additional safety check before accessing currentElement
            if (!currentElement) {
              console.log('Current element became null before getting properties');
              return;
            }
            
            rect = currentElement.getBoundingClientRect();
            computedCSS = getComputedSubset(currentElement);
          } catch (error) {
            console.log('Error getting element properties:', error);
            return;
          }
          
          // Initial positioning only if extension is still valid
          if (isExtensionContextValid() && !extensionDisabled) {
            updateOverlayPosition();
            overlay.style.display = 'block';
          } else {
            console.log('Extension disabled or context invalid, skipping overlay positioning');
            return;
          }
          
          // Add scroll event listener only if extension is still valid and not disabled
          if (isExtensionContextValid() && !extensionDisabled && currentElement) {
            // Create a wrapper function that checks if extension is still enabled
            const safeUpdateOverlayPosition = () => {
              // CRITICAL: Check if extension is disabled before doing anything
              if (extensionDisabled) {
                console.log('Extension disabled during scroll, removing listener');
                window.removeEventListener('scroll', safeUpdateOverlayPosition);
                return;
              }
              
              // CRITICAL: Check if currentElement exists before calling updateOverlayPosition
              if (!currentElement) {
                console.log('Current element is null during scroll, removing listener');
                window.removeEventListener('scroll', safeUpdateOverlayPosition);
                return;
              }
              
              updateOverlayPosition();
            };
            
            window.addEventListener('scroll', safeUpdateOverlayPosition);
            // Store the function reference to remove it later
            overlay.updatePositionFunc = safeUpdateOverlayPosition;
          } else {
            console.log('Skipping scroll listener - extension disabled, context invalid, or no current element');
          }
          
          // Get element classes
          const classes = currentElement.className;
          
          // Determine if element uses Tailwind
          const hasTailwindClasses = /\b(flex|grid|p-\d|m-\d|text-\w|bg-\w|rounded|shadow)\b/.test(classes);
          
          // Determine what to show based on mode
          let displayType = '';
          let displayClasses = '';
          
          if (mode === 'auto') {
            displayType = hasTailwindClasses ? 'tailwind' : 'css';
            displayClasses = hasTailwindClasses ? classes : convertCssToTailwind(computedCSS);
          } else if (mode === 'tailwind') {
            displayType = 'tailwind';
            displayClasses = classes;
          } else if (mode === 'css') {
            displayType = 'css';
            displayClasses = '';
          } else if (mode === 'convert') {
            displayType = 'converted';
            displayClasses = convertCssToTailwind(computedCSS);
          }
          
          // Update tooltip content only if extension is still valid
          if (isExtensionContextValid() && !extensionDisabled) {
            updateTooltip(displayType, displayClasses, computedCSS, currentElement);
            
            // Position tooltip
            positionTooltip(tooltip, rect, e.clientX, e.clientY);
          } else {
            console.log('Extension disabled or context invalid, skipping tooltip update');
          }
        }
    } catch (error) {
      console.log('Error in mouse move handler:', error);
      // Gracefully handle any errors
    }
  });
    
    // Mouse leave handler
    document.addEventListener('mouseleave', function() {
      if (!extensionDisabled) {
        hideUI();
      }
    });
    
    // Touch handler for mobile devices
    document.addEventListener('touchstart', function(e) {
      try {
        // Check if extension is disabled
        if (extensionDisabled) {
          return;
        }
        
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          console.log('Extension context invalidated during touch, disabling');
          disableExtension();
          return;
        }
        
        // Mobile detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.innerWidth <= 768 || 
                        'ontouchstart' in window;
        
        // Only handle touch on mobile devices
        if (!isMobile) {
          return;
        }
        
        // Get touch coordinates
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Skip if same element or our own UI elements
        if (element === currentElement || 
            element === overlay || 
            element === tooltip ||
            element?.closest('#classCatch-tooltip')) {
          return;
        }
        
        // Update current element
        currentElement = element;
        
        if (currentElement && document.contains(currentElement)) {
          // Get element properties
          let rect, computedCSS;
          try {
            // Additional safety check before accessing currentElement
            if (!currentElement) {
              console.log('Current element became null before getting properties');
              return;
            }
            
            rect = currentElement.getBoundingClientRect();
            computedCSS = getComputedSubset(currentElement);
          } catch (error) {
            console.log('Error getting element properties:', error);
            return;
          }
          
          // Initial positioning only if extension is still valid
          if (isExtensionContextValid() && !extensionDisabled) {
            updateOverlayPosition();
            overlay.style.display = 'block';
          } else {
            console.log('Extension disabled or context invalid, skipping overlay positioning');
            return;
          }
          
          // Get element classes
          const classes = currentElement.className;
          
          // Determine if element uses Tailwind
          const hasTailwindClasses = /\b(flex|grid|p-\d|m-\d|text-\w|bg-\w|rounded|shadow)\b/.test(classes);
          
          // Determine what to show based on mode
          let displayType = '';
          let displayClasses = '';
          
          if (mode === 'auto') {
            displayType = hasTailwindClasses ? 'tailwind' : 'css';
            displayClasses = hasTailwindClasses ? classes : convertCssToTailwind(computedCSS);
          } else if (mode === 'tailwind') {
            displayType = 'tailwind';
            displayClasses = classes;
          } else if (mode === 'css') {
            displayType = 'css';
            displayClasses = '';
          } else if (mode === 'convert') {
            displayType = 'converted';
            displayClasses = convertCssToTailwind(computedCSS);
          }
          
          // Update tooltip content only if extension is still valid
          if (isExtensionContextValid() && !extensionDisabled) {
            updateTooltip(displayType, displayClasses, computedCSS, currentElement);
            
            // Position tooltip for touch
            positionTooltip(tooltip, rect, touch.clientX, touch.clientY);
          } else {
            console.log('Extension disabled or context invalid, skipping tooltip update');
          }
        }
      } catch (error) {
        console.log('Error in touch handler:', error);
        // Gracefully handle any errors
      }
    });
    
    // Escape key handler
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !extensionDisabled) {
        hideUI();
      }
    });
    
    // Touch end handler for mobile
    document.addEventListener('touchend', function(e) {
      // Hide UI after a short delay to allow for button clicks
      setTimeout(() => {
        if (!extensionDisabled) {
          hideUI();
        }
      }, 2000); // 2 second delay to allow interaction
    });
    
    // Hide UI elements
    function hideUI() {
      try {
        // Remove scroll event listener if it exists
        if (overlay && overlay.updatePositionFunc) {
          window.removeEventListener('scroll', overlay.updatePositionFunc);
          overlay.updatePositionFunc = null;
        }
        
        if (overlay) overlay.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
        currentElement = null;
      } catch (error) {
        console.log('Error hiding UI:', error);
        // Reset state even if there's an error
        currentElement = null;
      }
    }
    
    // Update tooltip content
    function updateTooltip(type, classes, css, element) {
      try {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          console.log('Extension context invalidated during tooltip update, disabling');
          disableExtension();
          return;
        }
        
        // Set tooltip type class
        tooltip.className = theme;
      
      // Create tooltip content
      let content = `
        <style>
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(148,163,184,0.3);
            background: rgba(30,41,59,0.8);
            color: #e5e7eb;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .button:hover {
            background: rgba(51,65,85,0.9);
            border-color: rgba(148,163,184,0.5);
          }
          .button.primary {
            background: rgba(6,182,212,0.2);
            border-color: rgba(6,182,212,0.4);
            color: #06b6d4;
          }
          .button.primary:hover {
            background: rgba(6,182,212,0.3);
            border-color: rgba(6,182,212,0.6);
          }
          .buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
          }
        </style>
        <div class="header">
          <div class="logo">ClassCatch</div>
          <div class="type">${type === 'tailwind' ? 'Tailwind Classes' : type === 'converted' ? 'Converted to Tailwind' : 'CSS Properties'}</div>
        </div>
        <div class="content">
      `;
      
      // Add classes if available
      if (classes && (type === 'tailwind' || type === 'converted')) {
        content += `<div class="classes">${classes}</div>`;
      }
      
      // Add CSS details section
      if (type === 'css' || type === 'converted') {
        content += `
          <details>
            <summary>CSS Properties</summary>
            <div class="css-props">
        `;
        
        // Group properties by category
        const categories = {
          'Layout': ['display', 'position', 'z-index', 'overflow', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-content'],
          'Spacing': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap', 'column-gap', 'row-gap'],
          'Size': ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio'],
          'Typography': ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align'],
          'Color': ['color', 'background-color', 'opacity'],
          'Border': ['border-radius', 'border-width', 'border-style', 'border-color', 'box-shadow']
        };
        
        // Add each category
        Object.entries(categories).forEach(([category, props]) => {
          const categoryProps = props.filter(prop => css[prop] && css[prop] !== 'none' && css[prop] !== 'normal');
          
          if (categoryProps.length > 0) {
            content += `<div class="css-category"><div class="category-name">${category}</div>`;
            
            categoryProps.forEach(prop => {
              content += `
                <div class="css-prop">
                  <div class="prop-name">${prop}:</div>
                  <div class="prop-value">${css[prop]}</div>
                </div>
              `;
            });
            
            content += '</div>';
          }
        });
        
        content += '</div></details>';
      }
      
      // Add buttons
      content += `
        <div class="buttons">
      `;
      
      if (type === 'tailwind') {
        content += `<div class="button primary" id="copy-tailwind">Copy Tailwind</div>`;
        content += `<div class="button" id="copy-css">Copy as CSS</div>`;
      } else if (type === 'converted') {
        content += `<div class="button primary" id="copy-converted">Copy Tailwind</div>`;
        content += `<div class="button" id="copy-css">Copy as CSS</div>`;
      } else {
        content += `<div class="button" id="copy-converted">Copy as Tailwind</div>`;
        content += `<div class="button primary" id="copy-css">Copy CSS</div>`;
      }
      
      content += '</div>';
      
      // Define helper functions
      function updateFooter(result) {
        const isPro = result.plan === 'forever' || result.pageQuota === Infinity;
        const used = result.used || (result.usedPages || []).length;
        const pageQuota = isPro ? Infinity : (result.pageQuota || 3);
        const remaining = isPro ? 
          Infinity : 
          pageQuota - used;
        
        content += `
          <div class="footer">
            ${isPro ? '<span class="pro-badge">∞ FOREVER</span>' : 
              `<span class="usage-counter">Pages: ${remaining === Infinity ? '∞' : `${remaining}/${pageQuota}`}</span>`}
          </div>
        `;
        
        // Continue with setting tooltip content and adding event listeners
        finishTooltipSetup();
      }
      
      function finishTooltipSetup() {
        // Set tooltip content
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        
        // Add event listeners to buttons
        const copyTailwindBtn = document.getElementById('copy-tailwind');
        const copyConvertedBtn = document.getElementById('copy-converted');
        const copyCssBtn = document.getElementById('copy-css');
        
                 if (copyTailwindBtn) {
           copyTailwindBtn.addEventListener('click', function(e) {
             e.preventDefault();
             e.stopPropagation();
             handleButtonClick('tailwind', element, classes, css, this);
           });
         }
         
         if (copyConvertedBtn) {
           copyConvertedBtn.addEventListener('click', function(e) {
             e.preventDefault();
             e.stopPropagation();
             handleButtonClick('converted', element, classes, css, this);
           });
         }
         
         if (copyCssBtn) {
           copyCssBtn.addEventListener('click', function(e) {
             e.preventDefault();
             e.stopPropagation();
             handleButtonClick('css', element, classes, css, this);
           });
         }
      }
      
      // Add footer with usage info - get fresh data from background
      if (!isExtensionContextValid()) {
        console.log('Extension context not available, using defaults');
        updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
        return;
      }
      
      try {
        chrome.runtime.sendMessage({ type: 'GET_QUOTA' }, function(quotaResult) {
          // Check if extension context is still valid
          if (chrome.runtime.lastError) {
            console.log('Extension context invalidated, using fallback');
            // Fallback to storage if message fails
            try {
              chrome.storage.sync.get(['status', 'plan', 'pageQuota', 'usedPages'], function(result) {
                if (chrome.runtime.lastError) {
                  console.log('Storage also unavailable, using defaults');
                  updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
                } else {
                  updateFooter(result);
                }
              });
            } catch (error) {
              console.log('Storage unavailable, using defaults');
              updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
            }
          } else if (quotaResult && quotaResult.error) {
            try {
              chrome.storage.sync.get(['status', 'plan', 'pageQuota', 'usedPages'], function(result) {
                if (chrome.runtime.lastError) {
                  console.log('Storage unavailable, using defaults');
                  updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
                } else {
                  updateFooter(result);
                }
              });
            } catch (error) {
              console.log('Storage unavailable, using defaults');
              updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
            }
          } else {
            updateFooter(quotaResult);
          }
        });
      } catch (error) {
        console.log('Extension context invalidated, using fallback');
        // Fallback to storage if chrome.runtime is not available
        try {
          chrome.storage.sync.get(['status', 'plan', 'pageQuota', 'usedPages'], function(result) {
            if (chrome.runtime.lastError) {
              console.log('Storage also unavailable, using defaults');
              updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
            } else {
              updateFooter(result);
            }
          });
        } catch (storageError) {
          console.log('Storage unavailable, using defaults');
          updateFooter({ plan: 'free', pageQuota: 3, usedPages: [] });
        }
      }
    } catch (error) {
      console.log('Error in updateTooltip:', error);
      // Gracefully handle any errors
    }
  }
    
    // Position tooltip near cursor but keep on screen
    function positionTooltip(tooltip, elementRect, cursorX, cursorY) {
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // Mobile detection
      const isMobile = viewportWidth <= 768 || 'ontouchstart' in window;
      
      // Handle fullscreen mode
      const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      
      // Default position (below and to the right of cursor)
      let left = cursorX + 10;
      let top = cursorY + 10;
      
      // Mobile and fullscreen-specific positioning
      if (isMobile || isFullscreen) {
        // On mobile or fullscreen, position tooltip more conservatively
        left = Math.min(cursorX + 5, viewportWidth - tooltipRect.width - 20);
        top = Math.min(cursorY + 5, viewportHeight - tooltipRect.height - 20);
        
        // Ensure tooltip doesn't go off-screen
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        
        // Handle fullscreen constraints
        if (isFullscreen) {
          const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
          if (fullscreenElement) {
            const fsRect = fullscreenElement.getBoundingClientRect();
            left = Math.max(fsRect.left + 10, Math.min(left, fsRect.right - tooltipRect.width - 10));
            top = Math.max(fsRect.top + 10, Math.min(top, fsRect.bottom - tooltipRect.height - 10));
          }
        }
      } else {
        // Desktop positioning
        // Adjust if would go off right edge
        if (left + tooltipRect.width > viewportWidth - 10) {
          left = viewportWidth - tooltipRect.width - 10;
        }
        
        // Adjust if would go off bottom edge
        if (top + tooltipRect.height > viewportHeight - 10) {
          top = viewportHeight - tooltipRect.height - 10;
        }
        
        // Ensure not off left or top edge
        left = Math.max(10, left);
        top = Math.max(10, top);
      }
      
      // Set position
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }
  }
})();