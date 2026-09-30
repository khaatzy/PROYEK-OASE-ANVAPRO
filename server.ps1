$port = 8000
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Error "Gagal menjalankan listener di $prefix : $_"
    exit 1
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Server Localhost OASE Aktif!" -ForegroundColor Green
Write-Host " Akses di: $prefix" -ForegroundColor Yellow
Write-Host " Tekan Ctrl+C untuk menghentikan server." -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Cyan

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".sql"  = "text/plain; charset=utf-8"
    ".md"   = "text/markdown; charset=utf-8"
}

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
        if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "/index.html"
        }

        $relPath = $rawPath.TrimStart("/\").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relPath))

        if ($fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($fullPath)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 200 OK: $rawPath" -ForegroundColor Green
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 404 Not Found: $rawPath" -ForegroundColor Red
        }

        $response.OutputStream.Close()
    } catch {
        if ($listener.IsListening) {
            Write-Warning "Error memproses request: $_"
        }
    }
}
