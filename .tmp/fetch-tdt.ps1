$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force .tmp\tdt | Out-Null
$files = @{
  'main.js' = 'api?v=4.0&tk=test'
  'components.js' = 'v4.0/components.js'
  'service.js' = 'v4.0/service.js'
  'military.js' = 'v4.0/military.js'
}
foreach ($k in $files.Keys) {
  Invoke-WebRequest -Uri ('https://api.tianditu.gov.cn/' + $files[$k]) -UseBasicParsing -TimeoutSec 20 -OutFile ('.tmp\tdt\' + $k)
}
Get-ChildItem .tmp\tdt | Select-Object Name, Length
foreach ($k in $files.Keys) {
  $c = Get-Content ('.tmp\tdt\' + $k) -Raw
  $hits = [regex]::Matches($c, '.{60}subdomains.{140}')
  Write-Output ("==== " + $k + " subdomains hits: " + $hits.Count)
  $hits | Select-Object -First 6 | ForEach-Object { Write-Output $_.Value; Write-Output '---' }
}