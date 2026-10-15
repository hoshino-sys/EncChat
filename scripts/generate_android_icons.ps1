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

function Generate-Icon($size, $isRound, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = [Math]::Max(2, [int]($size * 0.08))
    $rectSize = $size - ($pad * 2)
    $sealColor = [System.Drawing.ColorTranslator]::FromHtml("#ab3838")
    $sealBrush = New-Object System.Drawing.SolidBrush $sealColor

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    if ($isRound) {
        $path.AddEllipse($pad, $pad, $rectSize, $rectSize)
    } else {
        $radius = [int]($rectSize * 0.22)
        $path.AddArc($pad, $pad, $radius, $radius, 180, 90)
        $path.AddArc($pad + $rectSize - $radius, $pad, $radius, $radius, 270, 90)
        $path.AddArc($pad + $rectSize - $radius, $pad + $rectSize - $radius, $radius, $radius, 0, 90)
        $path.AddArc($pad, $pad + $rectSize - $radius, $radius, $radius, 90, 90)
        $path.CloseFigure()
    }

    $g.FillPath($sealBrush, $path)

    # Draw Chinese character '墨'
    $fontSize = [float]($rectSize * 0.55)
    $font = New-Object System.Drawing.Font('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF $pad, ($pad + [int]($rectSize * 0.02)), $rectSize, $rectSize
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $font.Dispose()
    $sealBrush.Dispose()
    $path.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

function Generate-Foreground($size, $outPath) {
    # Adaptive icon foreground (108dp canvas with safe zone in the middle)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $sealSize = [int]($size * 0.60)
    $offset = [int](($size - $sealSize) / 2)
    $radius = [int]($sealSize * 0.22)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($offset, $offset, $radius, $radius, 180, 90)
    $path.AddArc($offset + $sealSize - $radius, $offset, $radius, $radius, 270, 90)
    $path.AddArc($offset + $sealSize - $radius, $offset + $sealSize - $radius, $radius, $radius, 0, 90)
    $path.AddArc($offset, $offset + $sealSize - $radius, $radius, $radius, 90, 90)
    $path.CloseFigure()

    $sealColor = [System.Drawing.ColorTranslator]::FromHtml("#ab3838")
    $sealBrush = New-Object System.Drawing.SolidBrush $sealColor
    $g.FillPath($sealBrush, $path)

    $fontSize = [float]($sealSize * 0.55)
    $font = New-Object System.Drawing.Font('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF $offset, ($offset + [int]($sealSize * 0.02)), $sealSize, $sealSize
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $font.Dispose()
    $sealBrush.Dispose()
    $path.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

foreach ($entry in $densities.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $sz = $entry.Value
    Generate-Icon $sz $false (Join-Path $folder "ic_launcher.png")
    Generate-Icon $sz $true (Join-Path $folder "ic_launcher_round.png")
    $fgSize = [int]($sz * 108 / 48)
    Generate-Foreground $fgSize (Join-Path $folder "ic_launcher_foreground.png")
}

# Also update adaptive icon background to #07080a
$bgXmlPath = "android/app/src/main/res/values/ic_launcher_background.xml"
$bgXmlContent = '<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#07080a</color>
</resources>'
Set-Content -Path $bgXmlPath -Value $bgXmlContent -Encoding UTF8

# Generate dark ink splash screen
function Generate-Splash($w, $h, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#07080a"))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)

    $sealSize = [int]($w * 0.35)
    $x = [int](($w - $sealSize) / 2)
    $y = [int](($h - $sealSize) / 2) - 20
    $radius = [int]($sealSize * 0.22)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $y, $radius, $radius, 180, 90)
    $path.AddArc($x + $sealSize - $radius, $y, $radius, $radius, 270, 90)
    $path.AddArc($x + $sealSize - $radius, $y + $sealSize - $radius, $radius, $radius, 0, 90)
    $path.AddArc($x, $y + $sealSize - $radius, $radius, $radius, 90, 90)
    $path.CloseFigure()

    $sealBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#ab3838"))
    $g.FillPath($sealBrush, $path)

    $fontSize = [float]($sealSize * 0.55)
    $font = New-Object System.Drawing.Font('SimSun', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF $x, ($y + [int]($sealSize * 0.02)), $sealSize, $sealSize
    $g.DrawString($charMo, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $font.Dispose()
    $sealBrush.Dispose()
    $path.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Splash 480 800 "android/app/src/main/res/drawable/splash.png"

Write-Host "All Android icons and backgrounds generated successfully!"
