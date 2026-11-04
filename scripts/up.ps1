# Starts the whole lab on Windows: containers, dependencies, AWS resources,
# API, worker and frontend (each one in its own window).
# Run from the repository root:
#   powershell -ExecutionPolicy Bypass -File scripts\up.ps1
# To stop: close the three windows, then run: docker compose down

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

function Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function PortBusy($port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

foreach ($tool in "docker", "node", "npm") {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Fail "Falta '$tool'. Instálalo y vuelve a ejecutar este script."
    }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Fail "Docker no está corriendo. Abre Docker Desktop y vuelve a ejecutar este script."
}

foreach ($port in 3000, 5173) {
    if (PortBusy $port) {
        Fail "El puerto $port ya está ocupado. ¿Ya hay una copia del laboratorio corriendo?"
    }
}

Step "Levantando contenedores (Floci, PostgreSQL y MongoDB)"
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose up falló." }

foreach ($dir in "backend", "frontend") {
    if (-not (Test-Path (Join-Path $root "$dir\node_modules"))) {
        Step "Instalando dependencias de $dir"
        Push-Location (Join-Path $root $dir)
        npm install
        $code = $LASTEXITCODE
        Pop-Location
        if ($code -ne 0) { Fail "npm install falló en $dir." }
    }
}

Step "Creando los recursos de AWS en Floci"
Push-Location (Join-Path $root "backend")
$ready = $false
foreach ($attempt in 1..20) {
    npm run init --silent *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Write-Host "    Esperando a que Floci esté listo ($attempt/20)..."
    Start-Sleep -Seconds 3
}
if (-not $ready) {
    Pop-Location
    Fail "Floci no respondió. Revisa: docker compose logs floci"
}
npm run check --silent
$checkCode = $LASTEXITCODE
Pop-Location
if ($checkCode -ne 0) { Fail "Las verificaciones fallaron. Consulta docs\01-setup.md" }

Step "Iniciando API, worker y frontend (una ventana para cada uno)"
Start-Process cmd.exe -ArgumentList "/k", "title TLP4 API && npm start" -WorkingDirectory (Join-Path $root "backend")
Start-Process cmd.exe -ArgumentList "/k", "title TLP4 Worker && npm run worker" -WorkingDirectory (Join-Path $root "backend")
Start-Process cmd.exe -ArgumentList "/k", "title TLP4 Frontend && npm run dev" -WorkingDirectory (Join-Path $root "frontend")

$apiReady = $false
foreach ($attempt in 1..30) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/health" -TimeoutSec 2 | Out-Null
        $apiReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $apiReady) { Fail "La API no respondió. Mira la ventana 'TLP4 API'." }

Write-Host ""
Write-Host "Todo listo. Abriendo http://localhost:5173" -ForegroundColor Green
Write-Host "Para detener: cierra las tres ventanas y ejecuta: docker compose down"
Start-Process "http://localhost:5173"
