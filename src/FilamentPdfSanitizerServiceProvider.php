<?php

namespace Filament\PdfSanitizer;

use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\ServiceProvider;

class FilamentPdfSanitizerServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Publish assets
        $this->publishes([
            __DIR__.'/../resources/js' => resource_path('js/vendor/filament-pdf-sanitizer'),
            __DIR__.'/../resources/views' => resource_path('views/vendor/filament-pdf-sanitizer'),
            __DIR__.'/../public' => public_path('vendor/filament-pdf-sanitizer'),
        ], 'filament-pdf-sanitizer-assets');

        // Publish config
        $this->publishes([
            __DIR__.'/../config/pdf-sanitizer.php' => config_path('pdf-sanitizer.php'),
        ], 'filament-pdf-sanitizer-config');

        // Register views
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'filament-pdf-sanitizer');
    }

    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../config/pdf-sanitizer.php',
            'pdf-sanitizer'
        );
    }
}

