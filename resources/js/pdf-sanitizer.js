// Lazy load PDF libraries only when needed
let pdfjsLibPromise = null;
let jsPDFPromise = null;

async function loadPdfjsLib(workerPath) {
    if (!pdfjsLibPromise) {
        pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
            // Configure worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
            return pdfjsLib;
        });
    }
    return pdfjsLibPromise;
}

async function loadJsPDF() {
    if (!jsPDFPromise) {
        jsPDFPromise = import('jspdf').then((module) => module.jsPDF);
    }
    return jsPDFPromise;
}

/**
 * Sanitize PDF by rendering pages to canvas and rebuilding
 * This completely removes all JavaScript, forms, annotations, and embedded scripts
 * by converting PDF pages to images and back to PDF
 */
export async function sanitizePdf(file, workerPath = '/vendor/filament-pdf-sanitizer/pdf.worker.min.js') {
    if (!file || file.type !== 'application/pdf') {
        return file; // Return as-is if not a PDF
    }

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

        // Create new PDF with jsPDF
        const outputPdf = new jsPDF({ unit: 'px', compress: true });
        let firstPage = true;

        // Process each page (reduced scale from 2.0 to 1.5 for smaller file size)
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2.0 for optimization

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

            // Convert canvas to image (reduced quality from 0.95 to 0.85 for smaller size)
            const imgData = canvas.toDataURL('image/jpeg', 0.85);

            // Add page to output PDF
            if (!firstPage) {
                outputPdf.addPage();
            }
            firstPage = false;

            // Add image to PDF (convert pixels to mm for jsPDF)
            const widthMm = (viewport.width * 0.264583);
            const heightMm = (viewport.height * 0.264583);
            outputPdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
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

        return sanitizedFile;
    } catch (error) {
        // If sanitization fails, return original file
        return file;
    }
}

// Track if sanitization is already initialized to prevent duplicate setup
let isInitialized = false;

/**
 * Setup PDF sanitization for Livewire file uploads
 */
export function setupPdfSanitization(workerPath = '/vendor/filament-pdf-sanitizer/pdf.worker.min.js') {
    // Prevent duplicate initialization
    if (isInitialized) {
        return;
    }

    isInitialized = true;

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
    // Store sanitized files for upload interception
    const sanitizedFilesCache = new WeakMap();

    // Intercept Livewire's upload requests
    if (window.Livewire) {
        // Also intercept XMLHttpRequest in case Livewire uses it
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (body) {
            // Intercept any request that contains FormData with files (could be signed URL upload)
            const isUploadRequest = (this._url && typeof this._url === 'string' &&
                (this._url.includes('/livewire/upload-file') ||
                    this._url.includes('/livewire/') ||
                    body instanceof FormData));

            if (isUploadRequest && body instanceof FormData) {
                const entries = Array.from(body.entries());
                let needsSanitization = false;
                const sanitizedEntries = [];

                for (const [key, value] of entries) {
                    if (value instanceof File) {
                        const isPdf = value.type === 'application/pdf' ||
                            value.name.toLowerCase().endsWith('.pdf');

                        if (isPdf) {
                            needsSanitization = true;
                            let sanitized;

                            if (sanitizedFilesCache.has(value)) {
                                sanitized = sanitizedFilesCache.get(value);
                            } else {
                                // We'll need to handle this synchronously, but let's try async
                                const self = this;
                                (async () => {
                                    const sanitized = await sanitizePdf(value, workerPath);
                                    sanitizedFilesCache.set(value, sanitized);

                                    // Create new FormData with sanitized file
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
                    body = newFormData;
                }
            }

            return originalXHRSend.apply(this, [body]);
        };

        // Intercept fetch requests to /livewire/upload-file
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = args[0];

            // Check if this is a Livewire file upload request (could be signed URL or direct upload)
            const isUploadRequest = typeof url === 'string' &&
                (url.includes('/livewire/upload-file') ||
                    url.includes('/livewire/') ||
                    (args[1]?.body instanceof FormData));

            if (isUploadRequest) {
                const options = args[1] || {};

                if (options.body instanceof FormData) {
                    const originalFormData = options.body;
                    const entries = Array.from(originalFormData.entries());
                    let needsSanitization = false;
                    const sanitizedEntries = [];

                    for (const [key, value] of entries) {
                        if (value instanceof File) {
                            const isPdf = value.type === 'application/pdf' ||
                                value.name.toLowerCase().endsWith('.pdf');

                            if (isPdf) {
                                needsSanitization = true;
                                let sanitized;

                                if (sanitizedFilesCache.has(value)) {
                                    sanitized = sanitizedFilesCache.get(value);
                                } else {
                                    sanitized = await sanitizePdf(value, workerPath);
                                    sanitizedFilesCache.set(value, sanitized);
                                }

                                sanitizedEntries.push([key, sanitized]);
                            } else {
                                sanitizedEntries.push([key, value]);
                            }
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
            }

            return originalFetch.apply(this, args);
        };
    }

    // Function to sanitize files in an input
    const sanitizeInputFiles = async (input) => {
        const files = Array.from(input.files);
        if (files.length === 0) return false;

        // Check if any file is a PDF
        const pdfFiles = files.filter(f =>
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
        );

        if (pdfFiles.length === 0) return false;

        // Show loading indicator if possible
        const wrapper = input.closest('.fi-fo-file-upload-wrapper, .filament-forms-file-upload-component');
        if (wrapper) {
            wrapper.style.opacity = '0.6';
            wrapper.style.pointerEvents = 'none';
        }

        try {
            const sanitizedFiles = await Promise.all(
                files.map(async (file) => {
                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                        const sanitized = await sanitizePdf(file, workerPath);
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
        } finally {
            // Restore UI
            if (wrapper) {
                wrapper.style.opacity = '';
                wrapper.style.pointerEvents = '';
            }
        }
    };

    // Intercept file input changes - sanitize PDFs before Livewire processes them
    document.addEventListener('change', async (e) => {
        const input = e.target;

        // Check if it's a file input with files
        if (input.type !== 'file' || !input.files || input.files.length === 0) return;

        // Skip if already sanitized (prevent infinite loop)
        if (input.dataset.sanitizing === 'true') {
            input.dataset.sanitizing = 'false';
            return;
        }

        // Check if any files are PDFs
        const files = Array.from(input.files);
        const hasPdf = files.some(f =>
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
        );

        if (hasPdf) {
            if (input.dataset.sanitizing !== 'true') {
                input.dataset.sanitizing = 'true';
                sanitizeInputFiles(input).then(() => {
                    input.dataset.sanitizing = 'false';
                }).catch(() => {
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
                        // Skip if already sanitized (prevent infinite loop)
                        if (this.dataset.sanitizing === 'true') {
                            this.dataset.sanitizing = 'false';
                            return;
                        }

                        const files = Array.from(this.files);
                        const hasPdf = files.some(f =>
                            f.type === 'application/pdf' ||
                            f.name.toLowerCase().endsWith('.pdf')
                        );

                        if (hasPdf) {
                            if (this.dataset.sanitizing !== 'true') {
                                this.dataset.sanitizing = 'true';
                                sanitizeInputFiles(this).then(() => {
                                    this.dataset.sanitizing = 'false';
                                }).catch(() => {
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

