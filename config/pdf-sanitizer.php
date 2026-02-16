<?php

return [
    /*
    |--------------------------------------------------------------------------
    | PDF Worker Path
    |--------------------------------------------------------------------------
    |
    | The path to the PDF.js worker file. This file is required for PDF
    | parsing and rendering. You can customize this path if you need to
    | serve the worker from a different location.
    |
    */
    'worker_path' => '/vendor/filament-pdf-sanitizer/pdf.worker.min.js',

    /*
    |--------------------------------------------------------------------------
    | Enable PDF Sanitization
    |--------------------------------------------------------------------------
    |
    | Set to false to disable PDF sanitization globally. This can be useful
    | for debugging or if you want to enable/disable it per panel.
    |
    */
    'enabled' => true,

    /*
    |--------------------------------------------------------------------------
    | PDF Rendering Scale
    |--------------------------------------------------------------------------
    |
    | The scale factor for rendering PDF pages. Higher values produce better
    | quality but larger file sizes. Recommended range: 1.0 - 3.0
    |
    */
    'scale' => 1.5,

    /*
    |--------------------------------------------------------------------------
    | JPEG Quality
    |--------------------------------------------------------------------------
    |
    | The JPEG quality for rendered pages (0.0 - 1.0). Higher values produce
    | better quality but larger file sizes. Recommended range: 0.7 - 0.95
    |
    */
    'quality' => 0.85,

    /*
    |--------------------------------------------------------------------------
    | Maximum File Size (MB)
    |--------------------------------------------------------------------------
    |
    | Maximum PDF file size to sanitize. Files larger than this will be
    | skipped. Set to null to disable size checking.
    |
    */
    'max_file_size_mb' => 50,

    /*
    |--------------------------------------------------------------------------
    | Maximum Pages
    |--------------------------------------------------------------------------
    |
    | Maximum number of pages to process. PDFs with more pages will be
    | skipped. Set to null to disable page limit.
    |
    */
    'max_pages' => null,

    /*
    |--------------------------------------------------------------------------
    | Show Progress Indicator
    |--------------------------------------------------------------------------
    |
    | Whether to show a visual progress indicator during sanitization.
    |
    */
    'show_progress' => true,

    /*
    |--------------------------------------------------------------------------
    | Log Errors
    |--------------------------------------------------------------------------
    |
    | Whether to log sanitization errors to the browser console.
    |
    */
    'log_errors' => true,
];
