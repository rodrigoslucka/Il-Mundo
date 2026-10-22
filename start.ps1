param(
  [int]$Port = 4173,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "dist"))
if (-not [System.IO.File]::Exists((Join-Path $root "index.html"))) {
  Write-Error "No existe la versión compilada. Ejecuta npm run build antes de iniciar el servidor."
  exit 1
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
  $listener.Start()
} catch {
  Write-Error "No se pudo abrir http://127.0.0.1:$Port/. Prueba otro puerto con .\start.ps1 -Port 4174. Detalle: $($_.Exception.Message)"
  exit 1
}

$base = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".svg" = "image/svg+xml; charset=utf-8"
  ".ico" = "image/x-icon"
  ".png" = "image/png"
  ".woff2" = "font/woff2"
}

Write-Host "Il Mundo está listo en http://127.0.0.1:$Port/"
Write-Host "Solo escucha en este equipo. Presiona Ctrl+C para detenerlo."

if ($OpenBrowser) {
  Start-Process "http://127.0.0.1:$Port/"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $request = $context.Request
      $response = $context.Response
      $relativePath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relativePath))
      if (-not $filePath.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        $response.StatusCode = 403
        $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
        $response.ContentLength64 = $body.Length
        $response.OutputStream.Write($body, 0, $body.Length)
        $response.Close()
        continue
      }

      if ($request.HttpMethod -notin @("GET", "HEAD")) {
        $response.StatusCode = 405
        $response.Headers.Add("Allow", "GET, HEAD")
        $response.Close()
        continue
      }

      if (-not [System.IO.File]::Exists($filePath)) {
        $response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        $response.ContentType = "text/plain; charset=utf-8"
        $response.ContentLength64 = $body.Length
        if ($request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($body, 0, $body.Length)
        }
        $response.Close()
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($filePath)
      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $response.StatusCode = 200
      $response.ContentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { "application/octet-stream" }
      $response.Headers.Add("Cache-Control", "no-cache")
      $response.Headers.Add("X-Content-Type-Options", "nosniff")
      $response.ContentLength64 = $body.Length
      if ($request.HttpMethod -ne "HEAD") {
        $response.OutputStream.Write($body, 0, $body.Length)
      }
      $response.Close()
    } catch {
      Write-Warning "No se pudo atender una solicitud: $($_.Exception.Message)"
      if ($context.Response.OutputStream.CanWrite) {
        $context.Response.StatusCode = 500
        $context.Response.Close()
      }
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
