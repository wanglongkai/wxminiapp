$ErrorActionPreference = 'Stop'
foreach ($k in @('main.js','components.js','service.js','military.js')) {
  $c = Get-Content ('.tmp\tdt\' + $k) -Raw
  Write-Output ("==== " + $k)
  foreach ($pat in @('.{80}\{s\}.{160}', '.{60}getTileUrl.{200}', '.{40}t\{s\}.{120}', '.{60}getLayers.{100}')) {
    $hits = [regex]::Matches($c, $pat)
    Write-Output ("-- pattern " + $pat + " hits: " + $hits.Count)
    $hits | Select-Object -First 4 | ForEach-Object { Write-Output $_.Value; Write-Output '---' }
  }
}