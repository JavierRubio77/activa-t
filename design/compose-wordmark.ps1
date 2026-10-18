Add-Type -AssemblyName System.Drawing
$basePath = Join-Path (Split-Path -Parent $PSScriptRoot) 'public\activa-t-splash-anna-v2.png'
$wordmarkPath = Join-Path $PSScriptRoot 'activa-t-wordmark-v1.png'
$outputPath = Join-Path $PSScriptRoot 'activa-t-splash-wordmark-preview.png'
$base = New-Object System.Drawing.Bitmap($basePath)
$wordmark = [System.Drawing.Image]::FromFile($wordmarkPath)
$graphics = [System.Drawing.Graphics]::FromImage($base)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$targetWidth = 960
$targetHeight = [int]($wordmark.Height * ($targetWidth / $wordmark.Width))
$x = [int](($base.Width - $targetWidth) / 2)
$y = 58
$graphics.DrawImage($wordmark, $x, $y, $targetWidth, $targetHeight)
$base.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $wordmark.Dispose(); $base.Dispose()
Write-Output $outputPath
