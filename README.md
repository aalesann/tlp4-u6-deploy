# TLP4 - Unidad 6: Despliegue en la nube (en localhost)

Laboratorio para practicar servicios de AWS sin cuenta, sin tarjeta y sin costos, usando
[Floci](https://floci.io/aws/), un emulador local de AWS. El stack es el de la cursada:
Express, React, MongoDB y PostgreSQL.

## Qué vas a levantar

```text
React (5173) ──► Express (3000) ──┬─► S3          archivos subidos
                                  ├─► PostgreSQL  metadatos de los archivos
                                  ├─► SQS         cola de eventos
                                  ├─► SSM         configuración
                                  └─► Secrets Mgr credenciales
                  Worker ◄── SQS ──► MongoDB      eventos procesados
                         └─► S3 + PostgreSQL        miniaturas de la galería
```

S3, SQS, SSM y Secrets Manager los emula Floci en `http://localhost:4566`.
PostgreSQL y MongoDB son contenedores normales.

## Requisitos

- Docker con Docker Compose
- Node.js 20 o superior

No hace falta instalar el AWS CLI: el servicio `aws` de `docker-compose.yml` lo ejecuta
dentro de Docker (`docker compose run --rm aws s3 ls`). Si usas Windows, lee antes
[Si usas Windows](#si-usas-windows).

## Inicio rápido

Un script levanta todo: contenedores, dependencias, recursos de AWS, API, worker y frontend.
Ejecútalo desde la raíz del repositorio.

Linux y macOS:

```bash
./scripts/up.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\up.ps1
```

Cuando termina, abre http://localhost:5173. En Linux y macOS, `Ctrl+C` detiene la API, el
worker y el frontend (los logs quedan en `.logs/`). En Windows cada uno corre en su propia
ventana: ciérralas para detenerlos. En ambos casos, `docker compose down` apaga los
contenedores.

### Paso a paso (lo que hace el script)

Terminal 1, desde la raíz del repositorio:

```bash
docker compose up -d     # Floci + PostgreSQL + MongoDB
cd backend
npm install
npm run init             # crea bucket, cola, parámetro y secreto
npm run check            # todo debe decir OK (y terminar en "Todo en orden.")
npm start                # API en :3000 (déjala corriendo)
```

Terminal 2, el worker de SQS:

```bash
cd backend
npm run worker
```

Terminal 3, React en :5173:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 y sube un archivo. La franja de progreso muestra cómo avanza por
S3, SQS, el worker y la miniatura. Si es una imagen, aparece en la galería; el archivo y su
evento se listan al final de la página. Si el worker está apagado, la franja te avisa.

## Guías

Hazlas en orden. Cada una explica el concepto y termina con ejercicios.

| Guía | Tema |
| --- | --- |
| [00 - Teoría](docs/00-teoria.md) | Conceptos de nube, servicios y arquitecturas. Léela primero |
| [01 - Puesta en marcha](docs/01-setup.md) | Qué es un emulador, levantar y verificar |
| [02 - S3](docs/02-s3.md) | Almacenamiento de objetos y URLs prefirmadas |
| [03 - Configuración y secretos](docs/03-config-y-secretos.md) | SSM Parameter Store y Secrets Manager |
| [04 - SQS](docs/04-sqs.md) | Colas y procesamiento asíncrono |
| [05 - Bases de datos](docs/05-bases-de-datos.md) | PostgreSQL y MongoDB, cada una para lo que sirve |
| [06 - Infraestructura como código](docs/06-iac-cloudformation.md) | CloudFormation |
| [07 - Galería de imágenes](docs/07-galeria.md) | Feature nueva: miniaturas generadas por el worker |

## Estructura

```text
docker-compose.yml   Floci + PostgreSQL + MongoDB
scripts/             up.sh (Linux/macOS) y up.ps1 (Windows): levantan todo
backend/             API Express, worker SQS y scripts (npm run init / check)
examples/            archivos de ejemplo para las guías
frontend/            React + Vite + Tailwind CSS (componentes en src/components)
infra/stack.yaml     plantilla CloudFormation
docs/                guías prácticas
```

## Si usas Windows

Los comandos están escritos para funcionar en PowerShell, CMD y Git Bash. Cuatro cosas a tener en cuenta:

- **`up.ps1`** se ejecuta con `-ExecutionPolicy Bypass`, como en el comando de arriba, porque
  Windows bloquea los scripts de PowerShell por defecto.
- **Docker Desktop** debe estar abierto, con el motor WSL 2 (la opción por defecto). Floci
  necesita acceso al socket de Docker, que Docker Desktop ya provee.
- **Git Bash** reescribe los argumentos que empiezan con `/`, como `--name /tlp4/app/greeting`.
  Antepón `MSYS_NO_PATHCONV=1` al comando, o usa PowerShell.
- **`curl` en PowerShell** es un alias de otro comando. Escribe `curl.exe`.

Al clonar, el archivo `.gitattributes` mantiene los saltos de línea en formato LF para que no
haya diferencias entre sistemas.

## Variables de entorno

Todas son opcionales: los valores por defecto funcionan con este repositorio.
Están definidas en [`backend/src/config.js`](backend/src/config.js). Las principales:
`AWS_ENDPOINT_URL`, `S3_BUCKET`, `SQS_QUEUE_NAME`, `DATABASE_URL`, `MONGO_URL`.

## Limpieza

```bash
docker compose down        # apaga, conserva los datos
docker compose down -v     # apaga y borra todos los datos
```

## Advertencia

Floci es para desarrollo y práctica. No replica la seguridad de AWS: las credenciales
`test`/`test` y el secreto de ejemplo son solo para este laboratorio.
