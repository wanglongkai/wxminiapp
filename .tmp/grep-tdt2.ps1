$ErrorActionPreference = 'Stop'
$c = Get-Content '.tmp\tdt\main.js' -Raw
foreach ($pat in @('HR:function.{300}', '.{100}tianditu\.gov\.cn.{150}', 'TileLayer=T\..{0,40}extend.{400}', '.{60}\.HR=.{150}')) {
  $hits = [regex]::Matches($c, $pat)
  Write-Output ("-- pattern " + $pat + " hits: " + $hits.Count)
  $hits | Select-Object -First 5 | ForEach-Object { Write-Output $_.Value; Write-Output '---' }
}