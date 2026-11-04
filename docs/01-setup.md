# 01 - Puesta en marcha

## Concepto: ¿por qué un emulador?

Practicar en AWS real exige cuenta, tarjeta y atención a la factura: un recurso olvidado
cuesta dinero. Un **emulador** implementa la misma API de AWS en tu máquina. Tu código no
sabe la diferencia: usa el mismo SDK, los mismos comandos y los mismos conceptos.

La única diferencia está en una línea de configuración, el **endpoint**:

```js
// backend/src/aws.js
new S3Client({ endpoint: "http://localhost:4566", region: "us-east-1", ... })
```

Para pasar a AWS real se elimina el endpoint y se usan credenciales reales. El resto del
código no cambia. Esa es la idea central de la unidad.

## Qué hay en `docker-compose.yml`

| Servicio | Puerto | Para qué |
| --- | --- | --- |
| `floci` | 4566 | Emula S3, SQS, SSM, Secrets Manager, CloudFormation, etc. |
| `postgres` | 5432 | Base relacional (usuario/clave/base: `tlp4`) |
| `mongo` | 27017 | Base documental |

Floci monta el socket de Docker (`/var/run/docker.sock`) porque algunos servicios necesitan
crear contenedores reales. El volumen `floci-data` conserva el estado entre reinicios.

## Paso a paso

```bash
docker compose up -d
docker compose ps            # los tres contenedores deben estar "running"
cd backend
npm install
npm run init
npm run check
```

`npm run init` crea los recursos de AWS que usa la aplicación. Es idempotente: puedes
ejecutarlo varias veces sin romper nada. `npm run check` comprueba que todo responda.
Ambos scripts están en `backend/scripts/` y usan el SDK de AWS para JavaScript, el mismo
que usa la API, así que funcionan igual en Windows, macOS y Linux.

## Usar el AWS CLI

`docker-compose.yml` incluye un servicio `aws` con el AWS CLI oficial, ya configurado para
hablar con Floci. Se ejecuta desde la raíz del repositorio:

```bash
docker compose run --rm aws s3 ls
docker compose run --rm aws sqs list-queues
```

Docker muestra algunas líneas sobre el contenedor antes de la respuesta; es normal. El
servicio monta la raíz del repositorio en `/work`, por lo que puede leer archivos del
proyecto (por ejemplo `infra/stack.yaml`).

Dentro de ese contenedor, Floci se llama `floci` y no `localhost`. Lo notarás en las URL de
las colas (guía 04).

Si prefieres instalar el AWS CLI en tu máquina, agrega `--endpoint-url http://localhost:4566`
a cada comando.

## Ejercicios

1. Ejecuta `docker compose run --rm aws s3 ls`. ¿Qué bucket aparece y quién lo creó?
2. Detén Floci con `docker stop tlp4-floci` y ejecuta `npm run check` (dentro de `backend`). ¿Qué falla
   y qué sigue funcionando? Vuelve a levantarlo con `docker start tlp4-floci`.
3. Ejecuta `docker compose down` y luego `docker compose up -d`. ¿Siguen existiendo el
   bucket y la cola? ¿Por qué? (Pista: el volumen `floci-data`.)
4. Ejecuta `docker compose down -v` y repite la pregunta anterior.

## Problemas frecuentes

- **El puerto 4566, 5432 o 27017 está ocupado:** hay otro servicio usando ese puerto.
  Deténlo o cambia el puerto de la izquierda en `docker-compose.yml`.
- **`npm run check` falla justo después de `docker compose up`:** espera unos segundos a que
  arranquen los contenedores y vuelve a ejecutarlo.
- **Permiso denegado sobre el socket de Docker:** tu usuario debe pertenecer al grupo
  `docker`.
