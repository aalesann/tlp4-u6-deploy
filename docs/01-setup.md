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
./scripts/init.sh
./scripts/check.sh
```

`init.sh` crea los recursos de AWS que usa la aplicación. Es idempotente: puedes ejecutarlo
varias veces sin romper nada.

## Usar el AWS CLI

`scripts/aws.sh` ejecuta el AWS CLI oficial apuntando a Floci:

```bash
./scripts/aws.sh s3 ls
./scripts/aws.sh sqs list-queues
```

Si prefieres instalar el AWS CLI, agrega `--endpoint-url http://localhost:4566` a cada
comando, o exporta `AWS_ENDPOINT_URL=http://localhost:4566`.

## Ejercicios

1. Ejecuta `./scripts/aws.sh s3 ls`. ¿Qué bucket aparece y quién lo creó?
2. Detén Floci con `docker stop tlp4-floci` y ejecuta `./scripts/check.sh`. ¿Qué falla
   y qué sigue funcionando? Vuelve a levantarlo con `docker start tlp4-floci`.
3. Ejecuta `docker compose down` y luego `docker compose up -d`. ¿Siguen existiendo el
   bucket y la cola? ¿Por qué? (Pista: el volumen `floci-data`.)
4. Ejecuta `docker compose down -v` y repite la pregunta anterior.

## Problemas frecuentes

- **El puerto 4566, 5432 o 27017 está ocupado:** hay otro servicio usando ese puerto.
  Deténlo o cambia el puerto de la izquierda en `docker-compose.yml`.
- **`check.sh` falla justo después de `docker compose up`:** espera unos segundos a que
  arranquen los contenedores y vuelve a ejecutarlo.
- **Permiso denegado sobre el socket de Docker:** tu usuario debe pertenecer al grupo
  `docker`.
