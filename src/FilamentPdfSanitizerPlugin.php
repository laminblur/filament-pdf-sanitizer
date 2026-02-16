<?php

namespace Laminblur\FilamentPdfSanitizer;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Config;
use InvalidArgumentException;

class FilamentPdfSanitizerPlugin implements Plugin
{
    protected ?string $workerPath = null;
    protected ?float $scale = null;
    protected ?float $quality = null;
    protected ?int $maxFileSizeMb = null;
    protected ?int $maxPages = null;
    protected bool $showProgress = true;
    protected bool $logErrors = true;

    /**
     * Create a new plugin instance.
     */
    public static function make(): static
    {
        return app(static::class);
    }

    /**
     * Get the unique identifier for this plugin.
     */
    public function getId(): string
    {
        return 'filament-pdf-sanitizer';
    }

    /**
     * Set the PDF worker path.
     */
    public function workerPath(?string $path): static
    {
        $this->workerPath = $path;

        return $this;
    }

    /**
     * Set the PDF rendering scale (1.0 - 3.0 recommended).
     */
    public function scale(?float $scale): static
    {
        if ($scale !== null && ($scale < 0.5 || $scale > 5.0)) {
            throw new InvalidArgumentException('Scale must be between 0.5 and 5.0');
        }

        $this->scale = $scale;

        return $this;
    }

    /**
     * Set the JPEG quality (0.0 - 1.0).
     */
    public function quality(?float $quality): static
    {
        if ($quality !== null && ($quality < 0 || $quality > 1)) {
            throw new InvalidArgumentException('Quality must be between 0.0 and 1.0');
        }

        $this->quality = $quality;

        return $this;
    }

    /**
     * Set the maximum file size in MB (null = unlimited).
     */
    public function maxFileSizeMb(?int $mb): static
    {
        if ($mb !== null && $mb < 1) {
            throw new InvalidArgumentException('Max file size must be at least 1 MB');
        }

        $this->maxFileSizeMb = $mb;

        return $this;
    }

    /**
     * Set the maximum number of pages to process (null = unlimited).
     */
    public function maxPages(?int $pages): static
    {
        if ($pages !== null && $pages < 1) {
            throw new InvalidArgumentException('Max pages must be at least 1');
        }

        $this->maxPages = $pages;

        return $this;
    }

    /**
     * Enable or disable progress indicators.
     */
    public function showProgress(bool $show = true): static
    {
        $this->showProgress = $show;

        return $this;
    }

    /**
     * Enable or disable error logging to console.
     */
    public function logErrors(bool $log = true): static
    {
        $this->logErrors = $log;

        return $this;
    }

    public function getWorkerPath(): string
    {
        return $this->workerPath ?? Config::get('pdf-sanitizer.worker_path', '/vendor/filament-pdf-sanitizer/pdf.worker.min.js');
    }

    public function getScale(): float
    {
        return $this->scale ?? Config::get('pdf-sanitizer.scale', 1.5);
    }

    public function getQuality(): float
    {
        return $this->quality ?? Config::get('pdf-sanitizer.quality', 0.85);
    }

    public function getMaxFileSizeMb(): ?int
    {
        return $this->maxFileSizeMb ?? Config::get('pdf-sanitizer.max_file_size_mb');
    }

    public function getMaxPages(): ?int
    {
        return $this->maxPages ?? Config::get('pdf-sanitizer.max_pages');
    }

    public function shouldShowProgress(): bool
    {
        return $this->showProgress && Config::get('pdf-sanitizer.show_progress', true);
    }

    public function shouldLogErrors(): bool
    {
        return $this->logErrors && Config::get('pdf-sanitizer.log_errors', true);
    }

    public function isEnabled(): bool
    {
        return Config::get('pdf-sanitizer.enabled', true);
    }

    /**
     * Register the plugin with the Filament panel.
     */
    public function register(Panel $panel): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $panel->renderHook(
            PanelsRenderHook::BODY_END,
            fn (): string => Blade::render('filament-pdf-sanitizer::pdf-sanitizer-script', [
                'workerPath' => $this->getWorkerPath(),
                'scale' => $this->getScale(),
                'quality' => $this->getQuality(),
                'maxFileSizeMb' => $this->getMaxFileSizeMb(),
                'maxPages' => $this->getMaxPages(),
                'showProgress' => $this->shouldShowProgress(),
                'logErrors' => $this->shouldLogErrors(),
            ])
        );
    }

    /**
     * Boot the plugin when the panel is in-use.
     */
    public function boot(Panel $panel): void
    {
        // Plugin is ready to use when panel is active
    }
}
