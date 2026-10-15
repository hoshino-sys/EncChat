Add-Type -AssemblyName System.Drawing

$resDir = "android/app/src/main/res"

$densities = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$charMo = [string][char]0x58a8
$cinnabarRed = [System.Drawing.ColorTranslator]::FromHtml("#a83232")

# 1. Generate Legacy Full-Bleed Icons (Zero black edges)
function Generate-Legacy-Icon($size, $isRound, $outPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $sealBrush = [System.Drawing.SolidBrush]::new($cinnabarRed)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()

    if ($isRound) {
        # Full-bleed circle (0 empty padding)
        $path.AddEllipse(0, 0, $size, $size)
        $g.FillPath($sealBrush, $path)

        # Fine inner circular border
        $innerPad = [int]($size * 0.08)
        $innerSize = $size - ($innerPad * 2)
        $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 255, 255, 255), [float]([Math]::Max(1.5, ($size * 0.025))))
        $g.DrawEllipse($borderPen, [float]$innerPad, [float]$innerPad, [float]$innerSize, [float]$innerSize)
        $borderPen.Dispose()
    } else {
        # Full-bleed rounded rectangle
        $radius = [int]($size * 0.22)
        $path.AddArc(0, 0, $radius, $radius, 180, 90)
        $path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
        $path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
        $path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
        $path.CloseFigure()
        $g.FillPath($sealBrush, $path)

        # Fine inner seal border
        $innerPad = [int]($size * 0.08)
        $innerSize = $size - ($innerPad * 2)
        $innerRadius = [int]($innerSize * 0.18)
        $innerPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $innerPath.AddArc($innerPad, $innerPad, $innerRadius, $innerRadius, 180, 90)
        $innerPath.AddArc($innerPad + $innerSize - $innerRadius, $innerPad, $innerRadius, $innerRadius, 270, 90)
        $innerPath.AddArc($innerPad + $innerSize - $innerRadius, $innerPad + $innerSize - $innerRadius, $innerRadius, $innerRadius, 0, 90)
        $innerPath.AddArc($innerPad, $innerPad + $innerSize - $innerRadius, $innerRadius, $innerRadius, 90, 90)
        $innerPath.CloseFigure()
        $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 255, 255, 255), [float]([Math]::Max(1.5, ($size * 0.025))))
        $g.DrawPath($borderPen, $innerPath)
        $borderPen.Dispose()
        $innerPath.Dispose()
    }

    # Draw Chinese character '墨' in white
    $fontSize = [float]($size * 0.52)
    $font = [System.Drawing.Font]::new('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new(0, [float]($size * 0.02), [float]$size, [float]$size)
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $font.Dispose()
    $sealBrush.Dispose()
    $path.Dispose()
    $sf.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

# 2. Generate Adaptive Icon Foreground (108dp canvas, safe zone center 66dp)
function Generate-Adaptive-Foreground($size, $outPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    # Safe zone size (58% of 108dp canvas)
    $sealSize = [int]($size * 0.58)
    $offset = [int](($size - $sealSize) / 2)
    $radius = [int]($sealSize * 0.22)

    # Decorative inner seal frame
    $innerPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $innerPath.AddArc($offset, $offset, $radius, $radius, 180, 90)
    $innerPath.AddArc($offset + $sealSize - $radius, $offset, $radius, $radius, 270, 90)
    $innerPath.AddArc($offset + $sealSize - $radius, $offset + $sealSize - $radius, $radius, $radius, 0, 90)
    $innerPath.AddArc($offset, $offset + $sealSize - $radius, $radius, $radius, 90, 90)
    $innerPath.CloseFigure()

    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(215, 255, 255, 255), [float]([Math]::Max(2.0, ($size * 0.018))))
    $g.DrawPath($borderPen, $innerPath)

    # Draw centered '墨' in white
    $fontSize = [float]($sealSize * 0.58)
    $font = [System.Drawing.Font]::new('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new([float]$offset, [float]($offset + ($sealSize * 0.02)), [float]$sealSize, [float]$sealSize)
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $borderPen.Dispose()
    $innerPath.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $sf.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

# Generate all mipmap densities
foreach ($entry in $densities.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $sz = $entry.Value
    Generate-Legacy-Icon $sz $false (Join-Path $folder "ic_launcher.png")
    Generate-Legacy-Icon $sz $true (Join-Path $folder "ic_launcher_round.png")
    $fgSize = [int]($sz * 108 / 48)
    Generate-Adaptive-Foreground $fgSize (Join-Path $folder "ic_launcher_foreground.png")
}

# 3. Update Adaptive Icon Background to solid cinnabar red #a83232 (eliminates black borders completely!)
$bgXmlPath = "android/app/src/main/res/values/ic_launcher_background.xml"
$bgXmlContent = '<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#a83232</color>
</resources>'
Set-Content -Path $bgXmlPath -Value $bgXmlContent -Encoding UTF8

$bgDrawablePath = "android/app/src/main/res/drawable/ic_launcher_background.xml"
$bgDrawableContent = '<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#a83232"
        android:pathData="M0,0h108v108h-108z" />
</vector>'
Set-Content -Path $bgDrawablePath -Value $bgDrawableContent -Encoding UTF8

# 4. Generate dark ink splash screen
function Generate-Splash($w, $h, $outPath) {
    $bmp = [System.Drawing.Bitmap]::new($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#07080a"))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)

    $sealSize = [int]($w * 0.35)
    $x = [int](($w - $sealSize) / 2)
    $y = [int](($h - $sealSize) / 2) - 20
    $radius = [int]($sealSize * 0.22)

    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($x, $y, $radius, $radius, 180, 90)
    $path.AddArc($x + $sealSize - $radius, $y, $radius, $radius, 270, 90)
    $path.AddArc($x + $sealSize - $radius, $y + $sealSize - $radius, $radius, $radius, 0, 90)
    $path.AddArc($x, $y + $sealSize - $radius, $radius, $radius, 90, 90)
    $path.CloseFigure()

    $sealBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#a83232"))
    $g.FillPath($sealBrush, $path)

    $fontSize = [float]($sealSize * 0.55)
    $font = [System.Drawing.Font]::new('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new([float]$x, [float]($y + ($sealSize * 0.02)), [float]$sealSize, [float]$sealSize)
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $font.Dispose()
    $sealBrush.Dispose()
    $path.Dispose()
    $bgBrush.Dispose()
    $sf.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Splash 480 800 "android/app/src/main/res/drawable/splash.png"

Write-Host "All Android icons regenerated with pure cinnabar background and zero black borders!"
