$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()
$checks = 0

function Read-Utf8File([string]$relativePath) {
    return [System.IO.File]::ReadAllText((Join-Path $root $relativePath), [System.Text.Encoding]::UTF8)
}

function Assert-Contains([string]$text, [string]$pattern, [string]$description) {
    $script:checks++
    if ($text -notmatch $pattern) { $script:failures.Add($description) }
}

$data = Read-Utf8File 'course-data.js'
$core = Read-Utf8File 'course-core.js'
$styles = Read-Utf8File 'course-components.css'

Assert-Contains $data "navigation:\s*\[" 'Course data is missing centralized navigation.'
Assert-Contains $data "goals:\s*\{" 'Course data is missing centralized learning goals.'
Assert-Contains $data "units:\s*\{" 'Course data is missing unit configuration.'
foreach ($unit in 1..4) {
    Assert-Contains $data "'$unit':\s*\{" "Course data is missing unit $unit."
}
Assert-Contains $core 'function mountNavigation' 'Shared core is missing navigation rendering.'
Assert-Contains $core 'function mountGoals' 'Shared core is missing learning-goals rendering.'
Assert-Contains $core 'function mountEndOfUnit' 'Shared core is missing end-of-unit rendering.'
Assert-Contains $styles '\.course-goals' 'Shared stylesheet is missing learning-goals styles.'

foreach ($unit in 1..4) {
    $page = Read-Utf8File "$unit.html"
    $unitAttribute = 'data-unit="' + $unit + '"'
    Assert-Contains $page $unitAttribute "Unit $unit is missing data-unit."
    Assert-Contains $page 'data-course-nav' "Unit $unit is missing the shared navigation mount."
    Assert-Contains $page 'data-course-goals' "Unit $unit is missing the shared goals mount."
    Assert-Contains $page 'course-components\.css' "Unit $unit does not load shared component styles."
    Assert-Contains $page 'course-data\.js' "Unit $unit does not load shared course data."
    Assert-Contains $page 'course-core\.js' "Unit $unit does not load the shared course core."
    Assert-Contains $page 'aria-live="polite"' "Unit $unit is missing live interaction feedback."
    Assert-Contains $page 'function answerReview' "Unit $unit is missing the review fallback."
    Assert-Contains $page 'function chooseDiscussion' "Unit $unit is missing the discussion fallback."
}

$unitOne = Read-Utf8File '1.html'
Assert-Contains $unitOne 'startBonanzaGame' 'Unit 1 is missing Binary Bonanza start.'
Assert-Contains $unitOne 'selectBonanzaGem' 'Unit 1 is missing alternate gem selection.'
Assert-Contains $unitOne "event\.key === 'Enter'" 'Unit 1 is missing keyboard Enter handling.'

$unitTwo = Read-Utf8File '2.html'
Assert-Contains $unitTwo 'playMysterySignal' 'Unit 2 is missing timed decode start.'
Assert-Contains $unitTwo 'startSendChallenge' 'Unit 2 is missing send challenge start.'
Assert-Contains $unitTwo 'checkSendChallenge' 'Unit 2 is missing send challenge checking.'

$unitFour = Read-Utf8File '4.html'
Assert-Contains $unitFour 'pe-free-draw-canvas' 'Unit 4 is missing the free-draw canvas.'
Assert-Contains $unitFour 'pe-drawing-grid' 'Unit 4 is missing the keyboard-accessible quantization grid.'
Assert-Contains $unitFour "event\.key === 'Enter'" 'Unit 4 is missing keyboard Enter handling.'
Assert-Contains $unitFour 'pe-compare-modal' 'Unit 4 is missing the quantization comparison dialog.'

if ($failures.Count -gt 0) {
    Write-Host "Interaction regression check failed ($($failures.Count)/$checks):" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "Interaction regression structure check passed: $checks checks." -ForegroundColor Green
