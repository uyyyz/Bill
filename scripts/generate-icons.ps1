Add-Type -AssemblyName System.Drawing

$imageDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\images'
$green = [System.Drawing.ColorTranslator]::FromHtml('#276B54')
$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

function New-IconCanvas([System.Drawing.Color]$background) {
  $bitmap = [System.Drawing.Bitmap]::new(1024, 1024)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear($background)
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-Yen([System.Drawing.Graphics]$graphics, [System.Drawing.Color]$color) {
  $brush = [System.Drawing.SolidBrush]::new($color)
  $font = [System.Drawing.Font]::new('Arial', 445, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('¥', $font, $brush, [System.Drawing.RectangleF]::new(190, 190, 644, 644), $format)
  $format.Dispose()
  $font.Dispose()
  $brush.Dispose()
}

function Save-Canvas($canvas, [string]$filename) {
  $canvas.Bitmap.Save((Join-Path $imageDirectory $filename), [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

$icon = New-IconCanvas $green
$whiteBrush = [System.Drawing.SolidBrush]::new($white)
$icon.Graphics.FillEllipse($whiteBrush, 194, 194, 636, 636)
Draw-Yen $icon.Graphics $green
Save-Canvas $icon 'icon.png'

$foreground = New-IconCanvas $transparent
$foreground.Graphics.FillEllipse($whiteBrush, 194, 194, 636, 636)
Draw-Yen $foreground.Graphics $green
Save-Canvas $foreground 'android-icon-foreground.png'

$background = New-IconCanvas $green
Save-Canvas $background 'android-icon-background.png'

$monochrome = New-IconCanvas $transparent
Draw-Yen $monochrome.Graphics $white
Save-Canvas $monochrome 'android-icon-monochrome.png'

$splash = New-IconCanvas $transparent
$splash.Graphics.FillEllipse($whiteBrush, 194, 194, 636, 636)
Draw-Yen $splash.Graphics $green
Save-Canvas $splash 'splash-icon.png'
$whiteBrush.Dispose()
