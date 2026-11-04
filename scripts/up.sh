#!/usr/bin/env bash
# Starts the whole lab on Linux and macOS: containers, dependencies, AWS resources,
# API, worker and frontend. Press Ctrl+C to stop the API, worker and frontend.
# The containers keep running; stop them with: docker compose down
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOGS="$ROOT/.logs"

fail() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

for tool in docker node npm curl; do
  command -v "$tool" >/dev/null 2>&1 || fail "Falta '$tool'. Instálalo y vuelve a ejecutar este script."
done
docker info >/dev/null 2>&1 || fail "Docker no está corriendo. Inícialo y vuelve a ejecutar este script."

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
for port in 3000 5173; do
  if port_busy "$port"; then
    fail "El puerto $port ya está ocupado. ¿Ya hay una copia del laboratorio corriendo?"
  fi
done

step "Levantando contenedores (Floci, PostgreSQL y MongoDB)"
docker compose up -d

for dir in backend frontend; do
  if [ ! -d "$dir/node_modules" ]; then
    step "Instalando dependencias de $dir"
    (cd "$dir" && npm install)
  fi
done

step "Creando los recursos de AWS en Floci"
ready=0
for attempt in $(seq 1 20); do
  if (cd backend && npm run init --silent) >/dev/null 2>&1; then ready=1; break; fi
  echo "    Esperando a que Floci esté listo ($attempt/20)..."
  sleep 3
done
[ "$ready" -eq 1 ] || fail "Floci no respondió. Revisa: docker compose logs floci"
(cd backend && npm run check --silent)

step "Iniciando API, worker y frontend (logs en .logs/)"
mkdir -p "$LOGS"
PIDS=()
(cd backend && exec node src/server.js) >"$LOGS/api.log" 2>&1 & PIDS+=($!)
(cd backend && exec node src/worker.js) >"$LOGS/worker.log" 2>&1 & PIDS+=($!)
(cd frontend && exec node node_modules/.bin/vite) >"$LOGS/frontend.log" 2>&1 & PIDS+=($!)

cleanup() {
  echo; echo "Deteniendo API, worker y frontend..."
  kill "${PIDS[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM

for attempt in $(seq 1 30); do
  curl -fs http://localhost:3000/health >/dev/null 2>&1 && break
  kill -0 "${PIDS[0]}" 2>/dev/null || fail "La API se detuvo. Revisa .logs/api.log"
  sleep 1
done
curl -fs http://localhost:3000/health >/dev/null 2>&1 || fail "La API no respondió. Revisa .logs/api.log"

echo
echo "Todo listo. Abre http://localhost:5173"
echo "Ctrl+C detiene la API, el worker y el frontend. Los contenedores: docker compose down"
wait "${PIDS[@]}" || true
