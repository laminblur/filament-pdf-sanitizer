# AGENTS.md

## Cursor Cloud specific instructions

This is a **PHP Composer library package** (not a standalone application). It provides a Filament PHP plugin for client-side PDF sanitization. It cannot be "run" independently — it must be installed into a Laravel + Filament application.

### Dependencies

- **PHP**: `composer install` (requires PHP 8.2+ with `ext-intl`)
- **JS**: `npm install` (installs `jspdf` and `pdfjs-dist`)

### Linting

The CI uses [Tighten Duster](https://github.com/tighten/duster) for PHP linting. Install globally via `composer global require tightenco/duster`, then run:

```bash
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
duster lint   # check
duster fix    # auto-fix
```

### Testing

No test suite exists yet (the `tests/` directory and `phpunit.xml` are absent despite the `autoload-dev` config). If tests are added, they should use Orchestra Testbench (`orchestra/testbench` is a dev dependency).

### Validating the library

Since this is a library, validate it by:

1. Checking PHP syntax: `php -l src/*.php`
2. Verifying autoloading: `php -r "require 'vendor/autoload.php'; new Laminblur\FilamentPdfSanitizer\FilamentPdfSanitizerPlugin();"`
3. Running `duster lint`

### Key files

| File | Purpose |
|------|---------|
| `src/FilamentPdfSanitizerServiceProvider.php` | Laravel service provider |
| `src/FilamentPdfSanitizerPlugin.php` | Filament plugin class |
| `config/pdf-sanitizer.php` | Publishable config |
| `resources/js/init.js` | JS entry point (lazy-loads sanitizer) |
| `resources/js/pdf-sanitizer.js` | Core sanitization logic |
| `public/pdf.worker.min.js` | PDF.js worker (must match `pdfjs-dist` version) |

### Gotchas

- `Config::get()` / other Laravel facades will throw `RuntimeException: A facade root has not been set` when testing classes outside a booted Laravel application. Use Orchestra Testbench for integration tests.
- The `composer.lock` and `package-lock.json` are `.gitignore`d — this is intentional for a library package.
