// Lazy load PDF libraries only when needed
let pdfjsLibPromise = null;
let jsPDFPromise = null;

/**
 * Get configuration from window object
 */
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
    
    // Ensure boolean values are actually booleans (Blade @js might convert them)
    return {
        ...config,
        showProgress: config.showProgress === true || config.showProgress === 'true' || config.showProgress === 1,
        logErrors: config.logErrors === true || config.logErrors === 'true' || config.logErrors === 1,
    };
}

/**
 * Log error if logging is enabled
 */
function logError(message, error = null) {
    const config = getConfig();
    if (config.logErrors) {
        const errorDetails = error instanceof Error ? error.message : (error || '');
        console.error('[Filament PDF Sanitizer]', message, errorDetails);
        if (error instanceof Error && error.stack) {
            console.error('[Filament PDF Sanitizer] Stack:', error.stack);
        }
    }
}

/**
 * Log warning if logging is enabled
 */
function logWarning(message) {
    const config = getConfig();
    if (config.logErrors) {
        console.warn('[Filament PDF Sanitizer]', message);
    }
}

/**
 * Log info if logging is enabled
 */
function logInfo(message) {
    const config = getConfig();
    if (config.logErrors) {
        console.log('[Filament PDF Sanitizer]', message);
    }
}

/**
 * Check if file is a PDF
 */
function isPdfFile(file) {
    if (!file) return false;
    return file.type === 'application/pdf' || 
           file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check file size limit
 */
function checkFileSize(file) {
    const config = getConfig();
    if (config.maxFileSizeMb && file.size > config.maxFileSizeMb * 1024 * 1024) {
        return {
            valid: false,
            message: `PDF file exceeds maximum size of ${config.maxFileSizeMb}MB`,
        };
    }
    return { valid: true };
}

/**
 * Show progress indicator
 */
function showProgress(input, message = 'Sanitizing PDF...') {
    const config = getConfig();
    if (!config.showProgress) {
        return null;
    }

    if (!input) {
        return null;
    }

    // Try multiple selectors to find the wrapper (Filament 3.x structure)
    const wrapper = input.closest('.fi-fo-file-upload-wrapper') ||
                    input.closest('.filament-forms-file-upload-component') ||
                    input.closest('.fi-input-wrp') ||
                    input.closest('.fi-input') ||
                    input.parentElement?.parentElement;
    
    if (!wrapper) {
        // If no wrapper found, create one around the input
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; display: inline-block; width: 100%;';
        input.parentNode?.insertBefore(container, input);
        container.appendChild(input);
        return showProgress(input, message);
    }

    // Ensure wrapper has relative positioning
    const wrapperPosition = window.getComputedStyle(wrapper).position;
    if (wrapperPosition === 'static' || !wrapperPosition) {
        wrapper.style.position = 'relative';
    }

    // Create or update progress indicator
    let indicator = wrapper.querySelector('.pdf-sanitizer-progress');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'pdf-sanitizer-progress';
        indicator.setAttribute('data-pdf-sanitizer-progress', 'true');
        indicator.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            z-index: 9999;
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            font-weight: 500;
            backdrop-filter: blur(2px);
        `;
        wrapper.appendChild(indicator);
    }

    const messageEl = indicator.querySelector('.pdf-sanitizer-message') || document.createElement('div');
    messageEl.className = 'pdf-sanitizer-message';
    messageEl.textContent = message;
    messageEl.style.cssText = 'margin-bottom: 0.5rem; font-weight: 500;';
    
    if (!indicator.querySelector('.pdf-sanitizer-message')) {
        indicator.appendChild(messageEl);
    }

    const spinner = indicator.querySelector('.pdf-sanitizer-spinner') || document.createElement('div');
    spinner.className = 'pdf-sanitizer-spinner';
    spinner.style.cssText = `
        width: 2rem;
        height: 2rem;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    `;
    
    if (!indicator.querySelector('.pdf-sanitizer-spinner')) {
        indicator.appendChild(spinner);
    }

    // Add spinner animation if not already in document
    if (!document.getElementById('pdf-sanitizer-styles')) {
        const style = document.createElement('style');
        style.id = 'pdf-sanitizer-styles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    indicator.style.display = 'flex';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.opacity = '0.8';

    return indicator;
}

/**
 * Hide progress indicator
 */
function hideProgress(input) {
    if (!input) return;
    
    const wrapper = input.closest('.fi-fo-file-upload-wrapper') ||
                    input.closest('.filament-forms-file-upload-component') ||
                    input.closest('.fi-input-wrp') ||
                    input.closest('.fi-input') ||
                    input.parentElement?.parentElement;
    
    if (wrapper) {
        const indicator = wrapper.querySelector('.pdf-sanitizer-progress');
        if (indicator) {
            indicator.style.display = 'none';
        }
        wrapper.style.pointerEvents = '';
        wrapper.style.opacity = '';
    }
}

/**
 * Update progress message
 */
function updateProgress(input, message, percent = null) {
    if (!input) return;
    
    const wrapper = input.closest('.fi-fo-file-upload-wrapper') ||
                    input.closest('.filament-forms-file-upload-component') ||
                    input.closest('.fi-input-wrp') ||
                    input.closest('.fi-input') ||
                    input.parentElement?.parentElement;
    
    if (wrapper) {
        const indicator = wrapper.querySelector('.pdf-sanitizer-progress');
        if (indicator) {
            const messageEl = indicator.querySelector('.pdf-sanitizer-message');
            if (messageEl) {
                messageEl.textContent = percent !== null ? `${message} (${percent}%)` : message;
            }
        }
    }
}

async function loadPdfjsLib(workerPath) {
    if (!pdfjsLibPromise) {
        pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
            // Configure worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
            return pdfjsLib;
        }).catch((error) => {
            logError('Failed to load PDF.js library', error);
            pdfjsLibPromise = null; // Reset on error
            throw error;
        });
    }
    return pdfjsLibPromise;
}

async function loadJsPDF() {
    if (!jsPDFPromise) {
        jsPDFPromise = import('jspdf').then((module) => module.jsPDF).catch((error) => {
            logError('Failed to load jsPDF library', error);
            jsPDFPromise = null; // Reset on error
            throw error;
        });
    }
    return jsPDFPromise;
}

/**
 * Sanitize PDF by rendering pages to canvas and rebuilding
 * This completely removes all JavaScript, forms, annotations, and embedded scripts
 * by converting PDF pages to images and back to PDF
 */
export async function sanitizePdf(file, options = {}) {
    if (!isPdfFile(file)) {
        return file; // Return as-is if not a PDF
    }

    const config = getConfig();
    logInfo(`Config loaded - showProgress: ${config.showProgress}, logErrors: ${config.logErrors}`);
    
    const {
        workerPath = config.workerPath,
        scale = config.scale,
        quality = config.quality,
        maxFileSizeMb = config.maxFileSizeMb,
        maxPages = config.maxPages,
        onProgress = null,
    } = options;

    // Check file size
    const sizeCheck = checkFileSize(file);
    if (!sizeCheck.valid) {
        logWarning(sizeCheck.message);
        return file; // Return original file if size check fails
    }

    logInfo(`Processing PDF: ${file.name}, Pages: checking...`);

    try {
        // Dynamically load libraries only when needed
        const [pdfjsLib, jsPDF] = await Promise.all([
            loadPdfjsLib(workerPath),
            loadJsPDF()
        ]);

        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF with pdfjsLib
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // Check page limit
        if (maxPages && numPages > maxPages) {
            logWarning(`PDF has ${numPages} pages, exceeding limit of ${maxPages}. Skipping sanitization.`);
            return file;
        }

        // Create new PDF with jsPDF
        const outputPdf = new jsPDF({ unit: 'px', compress: true });
        let firstPage = true;

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            if (onProgress) {
                onProgress(pageNum, numPages, `Processing page ${pageNum} of ${numPages}...`);
            }

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // Create canvas to render the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', quality);

            // Add page to output PDF
            if (!firstPage) {
                outputPdf.addPage();
            }
            firstPage = false;

            // Add image to PDF (convert pixels to mm for jsPDF)
            const widthMm = (viewport.width * 0.264583);
            const heightMm = (viewport.height * 0.264583);
            outputPdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);

            // Clean up canvas to free memory
            canvas.width = 0;
            canvas.height = 0;
        }

        // Generate sanitized PDF bytes
        const pdfBytes = outputPdf.output('arraybuffer');

        // Create a new File object with the sanitized PDF
        const sanitizedFile = new File(
            [pdfBytes],
            file.name,
            {
                type: 'application/pdf',
                lastModified: Date.now(),
            }
        );

        logInfo(`PDF sanitization successful: ${file.name} -> ${sanitizedFile.name} (${(sanitizedFile.size / 1024 / 1024).toFixed(2)} MB)`);
        return sanitizedFile;
    } catch (error) {
        logError('PDF sanitization failed', error);
        // If sanitization fails, return original file
        return file;
    }
}

// Track if sanitization is already initialized to prevent duplicate setup
let isInitialized = false;

/**
 * Setup PDF sanitization for Livewire file uploads
 */
export function setupPdfSanitization(options = {}) {
    // Prevent duplicate initialization
    if (isInitialized) {
        return;
    }

    isInitialized = true;

    const config = getConfig();
    const workerPath = options.workerPath || config.workerPath;

    // Wait for Livewire to be ready
    if (typeof window.Livewire === 'undefined') {
        document.addEventListener('livewire:init', () => {
            initSanitization(workerPath);
        });
    } else {
        initSanitization(workerPath);
    }
}

function initSanitization(workerPath) {
    const config = getConfig();
    logInfo('Initializing PDF sanitization...');
    logInfo(`Configuration: showProgress=${config.showProgress}, logErrors=${config.logErrors}, workerPath=${workerPath}`);
    
    // Store sanitized files for upload interception
    const sanitizedFilesCache = new WeakMap();
    const processingFiles = new WeakSet();

    // Helper function to sanitize a file with progress
    async function sanitizeFileWithProgress(file, input) {
        if (processingFiles.has(file)) {
            // Already processing, wait for it
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (sanitizedFilesCache.has(file)) {
                        clearInterval(checkInterval);
                        resolve(sanitizedFilesCache.get(file));
                    }
                }, 100);
            });
        }

        processingFiles.add(file);
        
        logInfo(`Starting sanitization for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        const progressIndicator = showProgress(input, 'Sanitizing PDF...');
        
        if (!progressIndicator && getConfig().showProgress) {
            logWarning('Progress indicator could not be created - wrapper element not found');
        }

        try {
            const sanitized = await sanitizePdf(file, {
                workerPath,
                onProgress: (current, total, message) => {
                    updateProgress(input, message, Math.round((current / total) * 100));
                },
            });

            sanitizedFilesCache.set(file, sanitized);
            logInfo(`Sanitization completed for file: ${file.name}`);
            return sanitized;
        } catch (error) {
            logError(`Sanitization failed for file: ${file.name}`, error);
            throw error;
        } finally {
            processingFiles.delete(file);
            hideProgress(input);
        }
    }

    // Intercept Livewire's upload requests
    if (window.Livewire) {
        // Intercept fetch requests (primary method for Livewire v3+)
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = args[0];
            const options = args[1] || {};

            // Check if this is a Livewire file upload request
            const isUploadRequest = typeof url === 'string' &&
                (url.includes('/livewire/upload-file') ||
                    url.includes('/livewire/') ||
                    (options.body instanceof FormData));

            if (isUploadRequest && options.body instanceof FormData) {
                const originalFormData = options.body;
                const entries = Array.from(originalFormData.entries());
                const sanitizedEntries = [];
                let needsSanitization = false;

                for (const [key, value] of entries) {
                    if (value instanceof File && isPdfFile(value)) {
                        // Find the input element that corresponds to this file
                        const input = document.querySelector(`input[type="file"][name="${key}"], input[type="file"][data-pdf-sanitize="true"]`);
                        
                        // Only sanitize if input is marked for sanitization
                        if (!input || !shouldSanitizeInput(input)) {
                            sanitizedEntries.push([key, value]);
                            continue;
                        }

                        needsSanitization = true;
                        let sanitized;

                        if (sanitizedFilesCache.has(value)) {
                            sanitized = sanitizedFilesCache.get(value);
                        } else {
                            sanitized = await sanitizeFileWithProgress(value, input);
                        }

                        sanitizedEntries.push([key, sanitized]);
                    } else {
                        sanitizedEntries.push([key, value]);
                    }
                }

                if (needsSanitization) {
                    const newFormData = new FormData();
                    for (const [key, value] of sanitizedEntries) {
                        if (value instanceof File) {
                            newFormData.append(key, value, value.name);
                        } else {
                            newFormData.append(key, value);
                        }
                    }
                    options.body = newFormData;
                }
            }

            return originalFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest (fallback for older Livewire versions)
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const isUploadRequest = (this._url && typeof this._url === 'string' &&
                (this._url.includes('/livewire/upload-file') ||
                    this._url.includes('/livewire/') ||
                    body instanceof FormData));

            if (isUploadRequest && body instanceof FormData) {
                const entries = Array.from(body.entries());
                const sanitizedEntries = [];
                let needsSanitization = false;

                for (const [key, value] of entries) {
                    if (value instanceof File && isPdfFile(value)) {
                        // Find the input element that corresponds to this file
                        const input = document.querySelector(`input[type="file"][name="${key}"], input[type="file"][data-pdf-sanitize="true"]`);
                        
                        // Only sanitize if input is marked for sanitization
                        if (!input || !shouldSanitizeInput(input)) {
                            sanitizedEntries.push([key, value]);
                            continue;
                        }

                        needsSanitization = true;
                        let sanitized;

                        if (sanitizedFilesCache.has(value)) {
                            sanitized = sanitizedFilesCache.get(value);
                        } else {
                            // This is async, so we need to handle it differently
                            const self = this;
                            (async () => {
                                const sanitized = await sanitizeFileWithProgress(value, input);
                                sanitizedFilesCache.set(value, sanitized);

                                const newFormData = new FormData();
                                for (const [k, v] of entries) {
                                    if (v === value && v instanceof File) {
                                        newFormData.append(k, sanitized, sanitized.name);
                                    } else if (v instanceof File && v !== value) {
                                        newFormData.append(k, v, v.name);
                                    } else {
                                        newFormData.append(k, v);
                                    }
                                }
                                originalXHRSend.call(self, newFormData);
                            })();
                            return; // Don't send original request
                        }

                        sanitizedEntries.push([key, sanitized]);
                    } else {
                        sanitizedEntries.push([key, value]);
                    }
                }

                if (needsSanitization && sanitizedEntries.every(([_, v]) => v instanceof File || !(v instanceof File))) {
                    const newFormData = new FormData();
                    for (const [key, value] of sanitizedEntries) {
                        if (value instanceof File) {
                            newFormData.append(key, value, value.name);
                        } else {
                            newFormData.append(key, value);
                        }
                    }
                    body = newFormData;
                }
            }

            return originalXHRSend.apply(this, [body]);
        };
    }

    /**
     * Check if an input should be sanitized
     */
    function shouldSanitizeInput(input) {
        // Only sanitize if the input has the data-pdf-sanitize attribute set to 'true'
        return input.hasAttribute('data-pdf-sanitize') && 
               input.getAttribute('data-pdf-sanitize') === 'true';
    }

    // Function to sanitize files in an input
    const sanitizeInputFiles = async (input) => {
        const files = Array.from(input.files);
        if (files.length === 0) return false;

        // Only sanitize if this input is marked for sanitization
        if (!shouldSanitizeInput(input)) return false;

        // Check if any file is a PDF
        const pdfFiles = files.filter(isPdfFile);
        if (pdfFiles.length === 0) return false;

        try {
            const sanitizedFiles = await Promise.all(
                files.map(async (file) => {
                    if (isPdfFile(file)) {
                        const sanitized = await sanitizeFileWithProgress(file, input);
                        sanitizedFilesCache.set(file, sanitized);
                        return sanitized;
                    }
                    return file;
                })
            );

            input.value = '';

            const dataTransfer = new DataTransfer();
            sanitizedFiles.forEach((file) => {
                dataTransfer.items.add(file);
            });
            input.files = dataTransfer.files;

            return true;
        } catch (error) {
            logError('Failed to sanitize input files', error);
            hideProgress(input);
            return false;
        }
    };

    // Intercept file input changes - sanitize PDFs before Livewire processes them
    document.addEventListener('change', async (e) => {
        const input = e.target;

        // Check if it's a file input with files
        if (input.type !== 'file' || !input.files || input.files.length === 0) return;

        // Skip if already sanitizing (prevent infinite loop)
        if (input.dataset.sanitizing === 'true') {
            input.dataset.sanitizing = 'false';
            return;
        }

        // Only sanitize if this input is marked for sanitization
        if (!shouldSanitizeInput(input)) return;

        // Check if any files are PDFs
        const files = Array.from(input.files);
        const hasPdf = files.some(isPdfFile);

        if (hasPdf) {
            if (input.dataset.sanitizing !== 'true') {
                input.dataset.sanitizing = 'true';
                sanitizeInputFiles(input).then(() => {
                    input.dataset.sanitizing = 'false';
                }).catch((error) => {
                    logError('Sanitization error', error);
                    input.dataset.sanitizing = 'false';
                });
            }
        }
    }, true); // Use capture phase to catch early - MUST be before Livewire's handler

    // Also hook into Livewire's morph updates for dynamically added file inputs
    if (window.Livewire) {
        window.Livewire.hook('morph.updated', ({ el }) => {
            // Find all file inputs in the updated element
            const fileInputs = el.querySelectorAll('input[type="file"]');

            fileInputs.forEach(input => {
                if (!input.dataset.sanitized) {
                    input.dataset.sanitized = 'true';

                    // Use capture phase to intercept before Livewire
                    input.addEventListener('change', async function (e) {
                        // Skip if already sanitizing (prevent infinite loop)
                        if (this.dataset.sanitizing === 'true') {
                            this.dataset.sanitizing = 'false';
                            return;
                        }

                        // Only sanitize if this input is marked for sanitization
                        if (!shouldSanitizeInput(this)) return;

                        const files = Array.from(this.files);
                        const hasPdf = files.some(isPdfFile);

                        if (hasPdf) {
                            if (this.dataset.sanitizing !== 'true') {
                                this.dataset.sanitizing = 'true';
                                sanitizeInputFiles(this).then(() => {
                                    this.dataset.sanitizing = 'false';
                                }).catch((error) => {
                                    logError('Sanitization error', error);
                                    this.dataset.sanitizing = 'false';
                                });
                            }
                        }
                    }, true); // Capture phase - runs before Livewire's handler
                }
            });
        });
    }

    // Also try to find and attach to existing file inputs
    setTimeout(() => {
        const existingInputs = document.querySelectorAll('input[type="file"]');
        existingInputs.forEach(input => {
            if (!input.dataset.sanitized) {
                input.dataset.sanitized = 'true';
            }
        });
    }, 1000);
}
