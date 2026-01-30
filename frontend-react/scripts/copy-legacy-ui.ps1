$sourceRoot = $env:UI_SOURCE_ROOT
if (-not $sourceRoot) {
  Write-Error "UI_SOURCE_ROOT is required."
  exit 1
}
$targetRoot = "d:\Jainam\MerQ\MerQPrime\frontend-react\src"
$publicTarget = "d:\Jainam\MerQ\MerQPrime\frontend-react\public"

$componentSource = Join-Path $sourceRoot "components"
$appSource = Join-Path $sourceRoot "app"
$hooksSource = Join-Path $sourceRoot "hooks"
$libSource = Join-Path $sourceRoot "lib"
$dataSource = Join-Path $sourceRoot "data"
$publicSource = Join-Path $sourceRoot "public"

$componentTarget = Join-Path $targetRoot "components"
$appTarget = Join-Path $targetRoot "app"
$hooksTarget = Join-Path $targetRoot "hooks"
$libTarget = Join-Path $targetRoot "lib"
$dataTarget = Join-Path $targetRoot "data"

Write-Host "Cleaning old extracted folders..."
Remove-Item -Recurse -Force (Join-Path $targetRoot "pages") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $targetRoot "styles") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $componentTarget -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $appTarget -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $hooksTarget -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $libTarget -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $dataTarget -ErrorAction SilentlyContinue

Write-Host "Copying app/ (pages, layout, styles)..."
Copy-Item -Path $appSource -Destination $appTarget -Recurse -Force

Write-Host "Copying components/"
Copy-Item -Path $componentSource -Destination $componentTarget -Recurse -Force

Write-Host "Copying hooks/"
Copy-Item -Path $hooksSource -Destination $hooksTarget -Recurse -Force

Write-Host "Copying lib/ (excluding api.ts)..."
Copy-Item -Path $libSource -Destination $libTarget -Recurse -Force
Remove-Item -Force (Join-Path $libTarget "api.ts") -ErrorAction SilentlyContinue

Write-Host "Copying data/"
Copy-Item -Path $dataSource -Destination $dataTarget -Recurse -Force

Write-Host "Copying public assets..."
Copy-Item -Path "$publicSource\*" -Destination $publicTarget -Recurse -Force

Write-Host "Copy complete. Now update API adapter and routes."
