// Track if PDF sanitizer has been loaded
let pdfSanitizerLoaded = false;
let pdfSanitizerPromise = null;

// Get worker path from window config or use default
const workerPath = window.filamentPdfSanitizerWorkerPath || '/vendor/filament-pdf-sanitizer/pdf.worker.min.js';

// Function to lazy load PDF sanitizer
function loadPdfSanitizer() {
    if (pdfSanitizerLoaded) {
        return Promise.resolve();
    }

    if (!pdfSanitizerPromise) {
        pdfSanitizerPromise = import('./pdf-sanitizer.js').then(({ setupPdfSanitization }) => {
            setupPdfSanitization(workerPath);
            pdfSanitizerLoaded = true;
        });
    }

    return pdfSanitizerPromise;
}

// Check for file inputs on page load
function checkForFileInputs() {
    if (document.querySelector('input[type="file"]')) {
        loadPdfSanitizer();
    }
}

// Watch for dynamically added file inputs (Livewire morphing, Filament)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if the added node or its children contain file inputs
                if ((node.matches && node.matches('input[type="file"]')) ||
                    (node.querySelector && node.querySelector('input[type="file"]'))) {
                    loadPdfSanitizer();
                    break;
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
        if (document.querySelector('input[type="file"]')) {
            loadPdfSanitizer();
        }
    });
} else {
    document.addEventListener('livewire:init', () => {
        window.Livewire.hook('morph.updated', () => {
            if (document.querySelector('input[type="file"]')) {
                loadPdfSanitizer();
            }
        });
    });
}

