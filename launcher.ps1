# Labello - Local WebUI Server for Windows
# Runs natively using Windows built-in PowerShell 3.0+ and .NET HttpListener.
# No Node.js, no Python, no extra runtimes required.

param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

# Determine root folder (where index.html is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $ScriptDir "dist\index.html")) {
    $RootFolder = Join-Path $ScriptDir "dist"
} elseif (Test-Path (Join-Path $ScriptDir "index.html")) {
    $RootFolder = $ScriptDir
} else {
    Write-Host "ERROR: Could not find index.html or dist\index.html" -ForegroundColor Red
    pause
    exit 1
}

# Find an available port if default is busy
$Listener = New-Object System.Net.HttpListener
$attemptPort = $Port
$started = $false

for ($i = 0; $i -lt 10; $i++) {
    try {
        $prefix = "http://localhost:$attemptPort/"
        $Listener.Prefixes.Clear()
        $Listener.Prefixes.Add($prefix)
        $Listener.Start()
        $started = $true
        $Port = $attemptPort
        break
    } catch {
        $attemptPort++
    }
}

if (-not $started) {
    Write-Host "Could not bind to local ports $Port-$attemptPort. Please check firewall or permissions." -ForegroundColor Red
    pause
    exit 1
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".wasm" = "application/wasm"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
    ".ogg"  = "audio/ogg"
    ".flac" = "audio/flac"
    ".txt"  = "text/plain; charset=utf-8"
    ".ini"  = "text/plain; charset=utf-8"
}

$url = "http://localhost:$Port/"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Labello - Vocal Labeling Workstation (Local WebUI)     " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server running at: $url" -ForegroundColor Green
Write-Host "Root folder: $RootFolder" -ForegroundColor Gray
Write-Host "Opening your default browser..." -ForegroundColor Yellow
Write-Host "Keep this window open while using Labello. Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan

# Open default browser
try {
    Start-Process $url
} catch {
    Write-Host "Please open $url in your web browser." -ForegroundColor Yellow
}

# Request processing loop
try {
    while ($Listener.IsListening) {
        $context = $Listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath) -or $relPath -eq "/") {
            $relPath = "index.html"
        }

        # Prevent directory traversal
        $relPath = $relPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($RootFolder, $relPath))

        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($RootFolder))) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        # Fallback to index.html for SPA client-side routes if file doesn't exist
        if (-not (Test-Path $fullPath -PathType Leaf)) {
            $fallback = Join-Path $RootFolder "index.html"
            if (Test-Path $fallback) {
                $fullPath = $fallback
            } else {
                $response.StatusCode = 404
                $response.Close()
                continue
            }
        }

        try {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = "application/octet-stream"
            if ($MimeTypes.ContainsKey($ext)) {
                $mime = $MimeTypes[$ext]
            }

            $response.ContentType = $mime
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Cache-Control", "no-cache")

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } catch {
            $response.StatusCode = 500
        } finally {
            $response.Close()
        }
    }
} finally {
    $Listener.Stop()
}
