Add-Type -AssemblyName System.Drawing
$root = "D:\isamgpt\21Dokdo"
$bgDir = Join-Path $root "public\assets\backgrounds"
$bank = Join-Path $root "asset-bank\backgrounds"
New-Item -ItemType Directory -Force $bank | Out-Null

$pairs = @(
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_36_25 (1).png"; dst = "bg_main.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_36_37 (2).png"; dst = "bg_ocean_view.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_36_44 (1).png"; dst = "bg_classroom.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_37_06 (1).png"; dst = "bg_briefing_desk.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_37_15 (1).png"; dst = "bg_ecology.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_37_20 (1).png"; dst = "bg_archive.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_37_27 (1).png"; dst = "bg_geology.jpg" },
  @{ src = "ChatGPT Image 2026" + [char]0xB144 + " 6" + [char]0xC6D4 + " 12" + [char]0xC77C + " " + [char]0xC624 + [char]0xD6C4 + " 04_37_34 (1).png"; dst = "bg_route.jpg" }
)

$W = 1280; $H = 720
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

foreach ($p in $pairs) {
  $srcPath = Join-Path $bgDir $p.src
  $dstPath = Join-Path $bgDir $p.dst
  if (-not (Test-Path -LiteralPath $srcPath)) { Write-Output ("MISSING: " + $p.src); continue }
  $img = [System.Drawing.Image]::FromFile($srcPath)
  $canvas = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  # cover 스케일 + 중앙 크롭
  $scale = [Math]::Max($W / $img.Width, $H / $img.Height)
  $dw = [int][Math]::Ceiling($img.Width * $scale)
  $dh = [int][Math]::Ceiling($img.Height * $scale)
  $dx = [int](($W - $dw) / 2)
  $dy = [int](($H - $dh) / 2)
  $g.DrawImage($img, $dx, $dy, $dw, $dh)
  $g.Dispose()
  $canvas.Save($dstPath, $jpegCodec, $encParams)
  $canvas.Dispose()
  $img.Dispose()
  Move-Item -LiteralPath $srcPath -Destination (Join-Path $bank $p.src)
  $newSize = [math]::Round((Get-Item -LiteralPath $dstPath).Length / 1KB, 0)
  Write-Output ($p.dst + " OK " + $newSize + "KB")
}
Write-Output "DONE"
