<?php

namespace Laminblur\FilamentPdfSanitizer\Forms\Components;

use Filament\Forms\Components\FileUpload;

class SanitizableFileUpload extends FileUpload
{
    protected bool $shouldSanitize = false;

    /**
     * Enable PDF sanitization for this file upload component.
     */
    public function sanitize(bool $sanitize = true): static
    {
        $this->shouldSanitize = $sanitize;

        return $this;
    }

    /**
     * Check if sanitization is enabled for this component.
     */
    public function shouldSanitize(): bool
    {
        return $this->shouldSanitize;
    }

    /**
     * Get the extra attributes for the input element.
     */
    public function getExtraInputAttributes(): array
    {
        $attributes = parent::getExtraInputAttributes();

        if ($this->shouldSanitize()) {
            $attributes['data-pdf-sanitize'] = 'true';
        }

        return $attributes;
    }
}

