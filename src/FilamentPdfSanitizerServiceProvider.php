<?php

namespace Laminblur\FilamentPdfSanitizer;

use Exception;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class FilamentPdfSanitizerServiceProvider extends ServiceProvider
{
    /**
     * Register any package services.
     */
    public function register(): void
    {
        // Merge package configuration with application config
        // This allows users to override config values without publishing
        $this->mergeConfigFrom(
            __DIR__ . '/../config/pdf-sanitizer.php',
            'pdf-sanitizer'
        );
    }

    /**
     * Bootstrap any package services.
     */
    public function boot(): void
    {
        // Register views namespace
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'filament-pdf-sanitizer');

        // Publish assets (JavaScript, views, and public files)
        $this->publishes([
            __DIR__ . '/../resources/js' => resource_path('js/vendor/filament-pdf-sanitizer'),
            __DIR__ . '/../resources/views' => resource_path('views/vendor/filament-pdf-sanitizer'),
            __DIR__ . '/../public' => public_path('vendor/filament-pdf-sanitizer'),
        ], 'filament-pdf-sanitizer-assets');

        // Publish configuration file
        $this->publishes([
            __DIR__ . '/../config/pdf-sanitizer.php' => config_path('pdf-sanitizer.php'),
        ], 'filament-pdf-sanitizer-config');

        // Automatically ensure PDF worker file is available in public directory
        // This runs on every boot to ensure the file exists, but only copies if missing
        $this->ensureWorkerFileExists();
    }

    /**
     * Ensure the PDF worker file exists in the public directory.
     * This automatically copies it if it doesn't exist, so users don't need to manually copy it.
     */
    protected function ensureWorkerFileExists(): void
    {
        $sourceFile = __DIR__ . '/../public/pdf.worker.min.js';
        $targetDir = public_path('vendor/filament-pdf-sanitizer');
        $targetFile = $targetDir . '/pdf.worker.min.js';

        // Only copy if source exists and target doesn't exist
        if (File::exists($sourceFile) && ! File::exists($targetFile)) {
            try {
                // Ensure target directory exists
                if (! File::isDirectory($targetDir)) {
                    File::makeDirectory($targetDir, 0755, true);
                }

                // Copy the worker file
                File::copy($sourceFile, $targetFile);
            } catch (Exception $e) {
                // Log error but don't break the application
                Log::warning('Failed to copy PDF worker file: ' . $e->getMessage(), [
                    'source' => $sourceFile,
                    'target' => $targetFile,
                ]);
            }
        }
    }
}
