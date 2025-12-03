<?php

namespace Filament\PdfSanitizer;

use Filament\Panel;
use Filament\Support\Concerns\EvaluatesClosures;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Blade;

class FilamentPdfSanitizerPlugin
{
    use EvaluatesClosures;

    protected ?string $workerPath = null;

    public function workerPath(?string $path): static
    {
        $this->workerPath = $path;

        return $this;
    }

    public function getWorkerPath(): string
    {
        return $this->workerPath ?? '/vendor/filament-pdf-sanitizer/pdf.worker.min.js';
    }

    public function register(Panel $panel): void
    {
        $panel->renderHook(
            PanelsRenderHook::BODY_END,
            fn (): string => Blade::render('filament-pdf-sanitizer::pdf-sanitizer-script', [
                'workerPath' => $this->getWorkerPath(),
            ])
        );
    }
}

