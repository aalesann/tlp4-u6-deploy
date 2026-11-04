# 06 - Infraestructura como código con CloudFormation

## Concepto

`npm run init` crea los recursos con código imperativo, uno por uno. Funciona, pero tiene
problemas: no queda registro de qué existe, es difícil replicar el entorno y borrar todo
exige recordar cada recurso.

**Infraestructura como código (IaC)** describe los recursos en un archivo versionable.
**CloudFormation** lee esa plantilla y crea un *stack*: un grupo de recursos que se crea,
actualiza y elimina como una unidad.

La plantilla `infra/stack.yaml` declara un bucket, una cola y un parámetro. Fíjate en dos
ideas:

- Es **declarativa**: describes el resultado, no los pasos.
- Usa **parámetros** (`Env`) y funciones (`!Sub`, `!Ref`) para reutilizarla en varios
  entornos (`dev`, `test`, `prod`) cambiando solo un valor.

## Paso a paso

```bash
docker compose run --rm aws cloudformation deploy --stack-name tlp4-iac --template-file infra/stack.yaml
docker compose run --rm aws cloudformation describe-stacks --stack-name tlp4-iac
docker compose run --rm aws s3 ls        # aparece tlp4-uploads-iac
```

Para crear otro entorno con la misma plantilla:

```bash
docker compose run --rm aws cloudformation deploy --stack-name tlp4-test --template-file infra/stack.yaml --parameter-overrides Env=test
```

Para eliminar todo el stack de una vez:

```bash
docker compose run --rm aws cloudformation delete-stack --stack-name tlp4-iac
```

## Ejercicios

1. Despliega el stack, lista los buckets y luego elimina el stack. ¿Qué pasó con el
   bucket? Compara con borrarlo a mano.
2. Crea un segundo entorno con `Env=test` y comprueba que conviven dos stacks.
3. Agrega a la plantilla un secreto (`AWS::SecretsManager::Secret`) y vuelve a desplegar.
   CloudFormation actualiza el stack existente en vez de crear uno nuevo.
4. Reemplaza `npm run init` por la plantilla: apunta el backend a los recursos del
   stack con las variables `S3_BUCKET` y `SQS_QUEUE_NAME`.
5. Discusión: ¿qué ventajas tiene revisar un cambio de infraestructura como un *pull
   request* en lugar de ejecutar comandos a mano?

## Siguiente paso

Cuando domines el laboratorio local, el mismo código y la misma plantilla se despliegan en
AWS real quitando `AWS_ENDPOINT_URL` y usando credenciales propias. Hazlo primero en una
cuenta de práctica y activa alertas de costos.
