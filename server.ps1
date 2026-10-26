# Servidor HTTP Local Ligero en PowerShell para Mandala Festivales
$port = 5050
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "🎸 Mandala Festivales - Servidor Local Iniciado" -ForegroundColor Green
    Write-Host "👉 Accedé desde tu navegador en: $prefix" -ForegroundColor Yellow
    Write-Host "Presioná Ctrl+C para detener el servidor" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan

    # Intentar abrir el navegador automáticamente
    Start-Process $prefix

    $mimeMap = @{
        ".html" = "text/html; charset=utf-8"
        ".js"   = "application/javascript; charset=utf-8"
        ".css"  = "text/css; charset=utf-8"
        ".png"  = "image/png"
        ".jpg"  = "image/jpeg"
        ".jpeg" = "image/jpeg"
        ".svg"  = "image/svg+xml"
        ".json" = "application/json; charset=utf-8"
        ".ico"  = "image/x-icon"
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }

        # Normalizar ruta en Windows
        $localPath = Join-Path (Get-Location).Path ($path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            
            # Encabezados CORS y No-Cache para desarrollo ágil
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado: $path")
            $response.ContentLength64 = $errBytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        }

        $response.Close()
    }
}
catch {
    Write-Error $_
}
finally {
    $listener.Stop()
    $listener.Close()
}
