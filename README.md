# Filament PDF Sanitizer

A Filament plugin that automatically sanitizes PDF files by removing JavaScript, forms, annotations, and embedded scripts before upload. This prevents AWS WAF and other security systems from blocking PDF uploads that contain executable content.

## Features

- 🔒 **Automatic PDF Sanitization** - Removes JavaScript, forms, and annotations from PDFs before upload
- 🚀 **Zero Configuration** - Works out of the box with Filament FileUpload components
- ⚡ **Lazy Loading** - Only loads PDF libraries when file inputs are detected
- 🎯 **Transparent** - Works seamlessly with Livewire file uploads
- 📦 **Lightweight** - Optimized bundle size with code splitting

## Installation

### Via Composer (when published)

```bash
composer require filament/pdf-sanitizer
```

### Local Development

1. Copy the package to your `packages` directory
2. Add to your `composer.json`:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "./packages/filament/pdf-sanitizer"
        }
    ],
    "require": {
        "filament/pdf-sanitizer": "*"
    }
}
```

3. Run:

```bash
composer require filament/pdf-sanitizer
```

4. Install npm dependencies:

```bash
npm install jspdf pdfjs-dist
```

5. Publish assets:

```bash
php artisan vendor:publish --tag=filament-pdf-sanitizer-assets
php artisan vendor:publish --tag=filament-pdf-sanitizer-config
```

6. Copy the PDF worker file:

```bash
cp packages/filament/pdf-sanitizer/public/pdf.worker.min.js public/vendor/filament-pdf-sanitizer/
```

## Usage

### Basic Usage

Add the plugin to your Filament panel provider:

```php
use Filament\PdfSanitizer\FilamentPdfSanitizerPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        ->plugins([
            FilamentPdfSanitizerPlugin::make(),
            // ... other plugins
        ]);
}
```

That's it! The plugin will automatically sanitize all PDF uploads in your Filament panels.

### Custom Worker Path

If you need to customize the PDF worker path:

```php
FilamentPdfSanitizerPlugin::make()
    ->workerPath('/custom/path/to/pdf.worker.min.js')
```

### Configuration

Publish the config file to customize settings:

```bash
php artisan vendor:publish --tag=filament-pdf-sanitizer-config
```

Edit `config/pdf-sanitizer.php`:

```php
return [
    'worker_path' => '/vendor/filament-pdf-sanitizer/pdf.worker.min.js',
    'enabled' => true,
];
```

## How It Works

1. **Detection**: The plugin detects when a PDF file is selected in a file input
2. **Sanitization**: Each PDF page is rendered to a canvas, converted to an image, and rebuilt as a clean PDF
3. **Interception**: The sanitized PDF replaces the original file before the upload request is sent
4. **Caching**: Sanitized files are cached to prevent re-processing on retry

### What Gets Removed

- ❌ JavaScript actions and event handlers
- ❌ PDF forms and interactive elements
- ❌ Annotations and comments
- ❌ Embedded objects and widgets
- ❌ Metadata scripts
- ❌ JavaScript-based links

### What Gets Preserved

- ✅ Visual content (text, images, graphics)
- ✅ Page layout and formatting
- ✅ Vector graphics and drawings
- ✅ File structure and organization

## Requirements

- PHP 8.2+
- Laravel 11+ or 12+
- Filament 3.x
- Node.js dependencies: `jspdf` and `pdfjs-dist`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### PDF Worker Not Found

If you see errors about the PDF worker file, ensure it's published:

```bash
php artisan vendor:publish --tag=filament-pdf-sanitizer-assets --force
```

Then copy the worker file:

```bash
cp packages/filament/pdf-sanitizer/public/pdf.worker.min.js public/vendor/filament-pdf-sanitizer/
```

### Upload Still Blocked

If uploads are still being blocked:

1. Check that the plugin is registered in your panel provider
2. Verify the PDF worker file is accessible at the configured path
3. Check browser console for JavaScript errors
4. Ensure npm dependencies are installed: `npm install jspdf pdfjs-dist`

### Build Errors

If you encounter Vite build errors:

1. Ensure the JavaScript files are in the correct location
2. Check your `vite.config.js` includes the package assets
3. Run `npm run build` to rebuild assets

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.

