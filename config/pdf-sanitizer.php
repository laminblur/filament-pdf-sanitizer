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
];

