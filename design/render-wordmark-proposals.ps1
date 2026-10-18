Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root 'public\activa-t-splash-anna-v2.png'
$outputPath = Join-Path $PSScriptRoot 'activa-t-wordmark-proposals.png'
$source = [System.Drawing.Image]::FromFile($sourcePath)

$cardW = 640
$cardH = 960
$labelH = 145
$gap = 36
$canvasW = ($cardW * 2) + ($gap * 3)
$canvasH = (($cardH + $labelH) * 2) + ($gap * 3)
$canvas = New-Object System.Drawing.Bitmap($canvasW, $canvasH)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0f1714'))

$styles = @(
  @{ Name = '1 · Redondeada energética'; Description = 'Cercana y amable'; Font = 'Trebuchet MS'; Size = 66; Style = [System.Drawing.FontStyle]::Bold },
  @{ Name = '2 · Condensada deportiva'; Description = 'Compacta y fitness'; Font = 'Impact'; Size = 76; Style = [System.Drawing.FontStyle]::Regular },
  @{ Name = '3 · Dinámica en movimiento'; Description = 'Ritmo y spinning'; Font = 'Arial Black'; Size = 64; Style = [System.Drawing.FontStyle]::Italic },
  @{ Name = '4 · Retro optimista'; Description = 'Expresiva y colorista'; Font = 'Cooper Black'; Size = 66; Style = [System.Drawing.FontStyle]::Regular }
)

$white = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f4f6ef'))
$shadow = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#173b30'))
$labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d8e1d2'))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#aebcac'))
$center = New-Object System.Drawing.StringFormat
$center.Alignment = [System.Drawing.StringAlignment]::Center
$center.LineAlignment = [System.Drawing.StringAlignment]::Near

for ($i = 0; $i -lt $styles.Count; $i++) {
  $style = $styles[$i]
  $col = $i % 2
  $row = [math]::Floor($i / 2)
  $x = $gap + ($col * ($cardW + $gap))
  $y = $gap + ($row * ($cardH + $labelH + $gap))
  $graphics.DrawImage($source, $x, $y, $cardW, $cardH)

  $font = New-Object System.Drawing.Font($style.Font, $style.Size, $style.Style, [System.Drawing.GraphicsUnit]::Pixel)
  $title = 'ACTIVA’T'
  $titleRect = New-Object System.Drawing.RectangleF($x + 16, $y + 28, $cardW - 32, 110)
  $graphics.DrawString($title, $font, $shadow, (New-Object System.Drawing.RectangleF($titleRect.X + 2, $titleRect.Y + 5, $titleRect.Width, $titleRect.Height)), $center)
  $graphics.DrawString($title, $font, $white, $titleRect, $center)

  $labelFont = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $descriptionFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString($style.Name, $labelFont, $labelBrush, (New-Object System.Drawing.PointF($x, $y + $cardH + 20)))
  $graphics.DrawString($style.Description, $descriptionFont, $mutedBrush, (New-Object System.Drawing.PointF($x, $y + $cardH + 62)))
  $font.Dispose(); $labelFont.Dispose(); $descriptionFont.Dispose()
}

$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $canvas.Dispose(); $source.Dispose()
Write-Output $outputPath
