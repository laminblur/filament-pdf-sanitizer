// Track if PDF sanitizer has been loaded
let pdfSanitizerLoaded = false;
let pdfSanitizerPromise = null;

// Get config from window object
function getConfig() {
    const config = window.filamentPdfSanitizerConfig || {
        workerPath: '/vendor/filament-pdf-sanitizer/pdf.worker.min.js',
        scale: 1.5,
        quality: 0.85,
        maxFileSizeMb: null,
        maxPages: null,
        showProgress: true,
        logErrors: true,
    };
    
    // Ensure boolean values are actually booleans (handle string conversions)
    return {
        ...config,
        showProgress: config.showProgress === true || config.showProgress === 'true' || config.showProgress === 1 || config.showProgress === '1',
        logErrors: config.logErrors === true || config.logErrors === 'true' || config.logErrors === 1 || config.logErrors === '1',
    };
}

// Function to lazy load PDF sanitizer
function loadPdfSanitizer() {
    if (pdfSanitizerLoaded) {
        return Promise.resolve();
    }

    if (!pdfSanitizerPromise) {
        const config = getConfig();
        
        // Debug log config (only if logging is enabled)
        if (config.logErrors) {
            console.log('[Filament PDF Sanitizer] Loading with config:', {
                showProgress: config.showProgress,
                logErrors: config.logErrors,
                workerPath: config.workerPath,
            });
        }
        
        pdfSanitizerPromise = import('./pdf-sanitizer.js').then(({ setupPdfSanitization }) => {
            setupPdfSanitization({ workerPath: config.workerPath });
            pdfSanitizerLoaded = true;
            
            if (config.logErrors) {
                console.log('[Filament PDF Sanitizer] Sanitizer loaded successfully');
            }
        }).catch((error) => {
            console.error('[Filament PDF Sanitizer] Failed to load sanitizer', error);
            pdfSanitizerPromise = null; // Reset on error
            throw error;
        });
    }

    return pdfSanitizerPromise;
}

// Check if file input accepts PDFs
function acceptsPdf(input) {
    if (!input || input.type !== 'file') return false;
    
    // Check accept attribute
    const accept = input.getAttribute('accept');
    if (accept && !accept.includes('pdf') && !accept.includes('application/pdf')) {
        return false;
    }
    
    return true;
}

// Check for file inputs on page load
function checkForFileInputs() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    for (const input of fileInputs) {
        if (acceptsPdf(input)) {
            loadPdfSanitizer();
            return;
        }
    }
}

// Watch for dynamically added file inputs (Livewire morphing, Filament)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if the added node is a file input
                if (node.matches && node.matches('input[type="file"]')) {
                    if (acceptsPdf(node)) {
                        loadPdfSanitizer();
                        break;
                    }
                }
                // Check if children contain file inputs
                if (node.querySelector) {
                    const fileInputs = node.querySelectorAll('input[type="file"]');
                    for (const input of fileInputs) {
                        if (acceptsPdf(input)) {
                            loadPdfSanitizer();
                            break;
                        }
                    }
                }
            }
        }
    }
});

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        checkForFileInputs();
        observer.observe(document.body, { childList: true, subtree: true });
    });
} else {
    checkForFileInputs();
    observer.observe(document.body, { childList: true, subtree: true });
}

// Also watch for Livewire initialization (in case file inputs are added via Livewire)
if (typeof window.Livewire !== 'undefined') {
    window.Livewire.hook('morph.updated', () => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
            if (acceptsPdf(input)) {
                loadPdfSanitizer();
                break;
            }
        }
    });
} else {
    document.addEventListener('livewire:init', () => {
        window.Livewire.hook('morph.updated', () => {
            const fileInputs = document.querySelectorAll('input[type="file"]');
            for (const input of fileInputs) {
                if (acceptsPdf(input)) {
                    loadPdfSanitizer();
                    break;
                }
            }
        });
    });
}

