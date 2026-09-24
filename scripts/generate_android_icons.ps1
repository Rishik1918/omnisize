Add-Type -AssemblyName System.Drawing

$srcPath = "public\icon.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found: $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath).Path)

function Resize-Icon($w, $h, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created $destPath ($w x $h)"
}

$densities = @{
    "mipmap-mdpi"    = @{ "app" = 48;  "fore" = 108 };
    "mipmap-hdpi"    = @{ "app" = 72;  "fore" = 162 };
    "mipmap-xhdpi"   = @{ "app" = 96;  "fore" = 216 };
    "mipmap-xxhdpi"  = @{ "app" = 144; "fore" = 324 };
    "mipmap-xxxhdpi" = @{ "app" = 192; "fore" = 432 };
}

foreach ($folder in $densities.Keys) {
    $dir = Join-Path "android\app\src\main\res" $folder
    if (Test-Path $dir) {
        $appSize = $densities[$folder]["app"]
        $foreSize = $densities[$folder]["fore"]
        Resize-Icon $appSize $appSize (Join-Path $dir "ic_launcher.png")
        Resize-Icon $appSize $appSize (Join-Path $dir "ic_launcher_round.png")
        Resize-Icon $foreSize $foreSize (Join-Path $dir "ic_launcher_foreground.png")
    }
}

$src.Dispose()

# Remove the old Capacitor vector icon that overrides mipmaps on Android 7+ (API 24+)
$vectorForeground = "android\app\src\main\res\drawable-v24\ic_launcher_foreground.xml"
if (Test-Path $vectorForeground) {
    Remove-Item $vectorForeground -Force
    Write-Output "Removed outdated vector foreground: $vectorForeground"
}

Write-Output "Android launcher icons generated successfully!"
