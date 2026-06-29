<div
    class="pdf-sanitizer-progress"
    style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); align-items: center; justify-content: center; flex-direction: column; z-index: 1000; border-radius: 0.5rem; color: white; font-size: 0.875rem;"
>
    <div class="pdf-sanitizer-message" style="margin-bottom: 0.5rem; font-weight: 500;">{{ $message ?? 'Sanitizing PDF...' }}</div>
    <div class="pdf-sanitizer-spinner" style="width: 2rem; height: 2rem; border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
</div>

<style>
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
