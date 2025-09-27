param(
  [string]$Version = "1.31.2",
  [string]$LayerName = "pg8000",
  [string]$PythonDirRel = "backend\layers\pg8000\python",
  [string]$ZipPathRel = "backend\layers\pg8000\pg8000-layer.zip"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Resolve paths
$RepoRoot = (Resolve-Path ".").Path
$PythonDir = Join-Path $RepoRoot $PythonDirRel
$ZipPath = Join-Path $RepoRoot $ZipPathRel

# Prepare folder
if (Test-Path $PythonDir) { Remove-Item $PythonDir -Recurse -Force }
New-Item -ItemType Directory -Path $PythonDir | Out-Null

Write-Host "Installing pg8000==$Version into $PythonDir ..."
python -m pip install "pg8000==$Version" -t $PythonDir

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Write-Host "Zipping layer to $ZipPath ..."
Compress-Archive -Path (Join-Path $PythonDir '*') -DestinationPath $ZipPath -Force

Write-Host "Done. Layer ZIP at: $ZipPath"
Write-Host "Publish with AWS CLI, e.g.:"
Write-Host "aws lambda publish-layer-version --layer-name $LayerName --zip-file fileb://$ZipPathRel --compatible-runtimes python3.12 --region us-east-1"
