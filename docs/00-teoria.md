# 00 - Teoría: lo que debes saber antes de practicar

Lee este documento antes de las guías prácticas. No hace falta memorizarlo: sirve para que,
cuando uses un servicio, sepas qué problema resuelve y por qué existe. Cada sección termina
con preguntas de autoevaluación y con la guía donde se aplica.

## 1. Qué es la computación en la nube

Es usar recursos de cómputo, almacenamiento y redes que pertenecen a un proveedor, a través
de internet, y pagar solo por lo que se consume. En lugar de comprar y mantener servidores,
se alquilan servicios.

| Modelo | Qué gestionas tú | Ejemplo |
| --- | --- | --- |
| IaaS (infraestructura como servicio) | Sistema operativo, runtime y aplicación | Máquinas virtuales (EC2) |
| PaaS (plataforma como servicio) | Solo la aplicación y sus datos | Elastic Beanstalk, plataformas de despliegue |
| SaaS (software como servicio) | Nada: usas el producto | Correo web, herramientas de oficina |

Los servicios de este laboratorio (S3, SQS, SSM) son **servicios administrados**: el
proveedor se encarga de la disponibilidad, los parches y el escalado.

**Modelo de responsabilidad compartida.** El proveedor es responsable de la seguridad *de*
la nube (centros de datos, hardware, red). Tú eres responsable de la seguridad *en* la nube:
quién tiene acceso, qué datos subes, cómo configuras cada servicio.

Preguntas:
1. ¿Qué diferencia hay entre alquilar una máquina virtual y usar S3?
2. Si un bucket de S3 queda público por error, ¿de quién es la responsabilidad?

## 2. Regiones y zonas de disponibilidad

Una **región** es una ubicación geográfica con varios centros de datos (por ejemplo,
`us-east-1`). Una **zona de disponibilidad** es uno o más centros de datos aislados dentro de
una región. Repartir una aplicación en varias zonas la protege de la caída de un centro de
datos.

Elegir región afecta la latencia (cercanía a los usuarios), el costo y las normativas sobre
dónde pueden almacenarse los datos. En el laboratorio todo usa `us-east-1`.

Preguntas:
1. ¿Por qué conviene desplegar en más de una zona de disponibilidad?
2. ¿Qué criterios usarías para elegir la región de una aplicación real?

## 3. Identidad y acceso (IAM)

**IAM** controla quién puede hacer qué sobre cada recurso.

- **Usuario:** una persona o programa con credenciales propias.
- **Rol:** una identidad temporal que asume un servicio o una persona; no tiene contraseña
  fija. Es la forma recomendada de dar permisos a una aplicación en AWS.
- **Política:** un documento que enumera acciones permitidas o denegadas sobre recursos.
- **Credenciales:** un par `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`. Son equivalentes
  a una contraseña y nunca se suben al repositorio.

**Principio de mínimo privilegio:** otorga solo los permisos necesarios para la tarea. Si un
servicio solo lee de un bucket, no debe poder borrarlo.

En el laboratorio las credenciales son `test`/`test` y Floci no las valida como lo haría
AWS. Es cómodo para practicar, pero oculta una parte real del trabajo: en producción, un
permiso faltante produce un error de acceso denegado que debes saber diagnosticar.

Preguntas:
1. ¿Por qué es preferible un rol a unas claves de acceso guardadas en el código?
2. ¿Qué permisos mínimos necesita la API de este laboratorio?

## 4. Los servicios del laboratorio

| Servicio | Qué es | Cuándo usarlo | Guía |
| --- | --- | --- | --- |
| **S3** | Almacenamiento de objetos en buckets, accesible por HTTP | Archivos subidos, imágenes, copias de seguridad, sitios estáticos | [02](02-s3.md) |
| **SQS** | Cola de mensajes administrada | Desacoplar tareas lentas de la respuesta al usuario | [04](04-sqs.md) |
| **SSM Parameter Store** | Almacén de configuración | Valores que cambian sin recompilar y no son secretos | [03](03-config-y-secretos.md) |
| **Secrets Manager** | Almacén de secretos con control de acceso y rotación | Contraseñas, claves de API, tokens | [03](03-config-y-secretos.md) |
| **RDS / DocumentDB** | Bases de datos administradas (relacional / documental) | Cuando no quieres operar tu propia base | [05](05-bases-de-datos.md) |
| **CloudFormation** | Infraestructura descrita en plantillas | Crear y destruir entornos de forma repetible | [06](06-iac-cloudformation.md) |

Detalles que conviene conocer:

- **S3** guarda *objetos* identificados por una clave; no hay carpetas reales. Es *durable*
  (los datos se replican) y escala sin que lo administres. Un bucket es privado por defecto.
- **SQS** estándar entrega cada mensaje *al menos una vez* y no garantiza el orden. Mientras
  un consumidor procesa un mensaje, este queda invisible durante el *tiempo de visibilidad*;
  si no se borra antes de que venza, vuelve a la cola.
- **Parameter Store frente a Secrets Manager:** el primero sirve para configuración
  general; el segundo está pensado para secretos y añade rotación automática y auditoría.

Preguntas:
1. ¿Por qué guardar la contraseña de una base en Secrets Manager y no en un archivo `.env`
   versionado?
2. ¿Qué pasa con un mensaje de SQS si el consumidor falla antes de borrarlo?

## 5. Arquitecturas que usamos

**Tres capas.** Presentación (React), lógica (Express) y datos (PostgreSQL y MongoDB). Cada
capa se puede cambiar o escalar por separado.

**Procesamiento asíncrono con colas.** La API responde rápido y delega el trabajo pesado:

```text
API ──► [ cola ] ──► worker
(rápida)  (buffer)   (a su ritmo)
```

Permite absorber picos de carga, reintentar fallos y escalar los workers de forma
independiente.

**Arquitectura orientada a eventos.** Un componente publica un hecho ("se subió un archivo")
y otros reaccionan. El productor no sabe quién consume, por eso se pueden sumar
consumidores (como la galería) sin tocarlo. Es la idea de la [guía 07](07-galeria.md).

Preguntas:
1. ¿Qué ventaja tiene generar la miniatura en el worker y no dentro de la petición?
2. ¿Qué costo tiene la arquitectura asíncrona frente a hacerlo todo en la petición?

## 6. Conceptos transversales

- **Servidor descartable (stateless).** Una instancia no guarda estado propio: archivos,
  sesiones y datos viven en servicios aparte. Así puedes reemplazarla o duplicarla sin
  perder nada.
- **Idempotencia.** Una operación es idempotente si repetirla produce el mismo resultado que
  hacerla una vez. Es necesaria porque SQS puede entregar un mensaje más de una vez. En el
  laboratorio, la miniatura usa una clave determinista y `ON CONFLICT DO NOTHING`.
- **Consistencia eventual.** Tras una escritura, distintas partes del sistema pueden ver el
  cambio en momentos diferentes. En la galería, la imagen aparece unos segundos después de
  subirla porque el worker trabaja de forma asíncrona.
- **Reintentos y tolerancia a fallos.** Los fallos transitorios son normales en la nube.
  Un worker no debe borrar un mensaje hasta terminar con éxito.
- **Aplicaciones de 12 factores.** Un conjunto de buenas prácticas. Las más relevantes aquí:
  guardar la *configuración en el entorno* y no en el código, tratar los servicios de
  apoyo (bases, colas) como *recursos intercambiables* mediante una URL, y registrar los
  logs como flujo de salida.

Preguntas:
1. ¿Por qué un servidor que guarda archivos en su propio disco no es descartable?
2. Da un ejemplo de operación que sea idempotente y otro que no lo sea.

## 7. Infraestructura como código

Describir los recursos en archivos versionables, en lugar de crearlos a mano.

- **Imperativo:** una lista de comandos (`scripts/init.sh`). Dice *cómo* hacerlo.
- **Declarativo:** una plantilla con el estado deseado (`infra/stack.yaml`). Dice *qué*
  debe existir y la herramienta calcula los pasos.

Un **stack** de CloudFormation agrupa recursos que se crean, actualizan y eliminan como una
unidad. Beneficios: repetibilidad, revisión de cambios como código, y destruir un entorno
completo sin olvidar nada. Se aplica en la [guía 06](06-iac-cloudformation.md).

Preguntas:
1. ¿Qué ventaja tiene una plantilla frente a un script de comandos?
2. ¿Por qué conviene que la plantilla reciba parámetros como `Env`?

## 8. Emulación local frente a AWS real

Floci implementa la API de AWS en tu máquina. El código de la aplicación es el mismo; solo
cambia el *endpoint* (`http://localhost:4566`) y las credenciales.

Lo que el emulador **sí** te da: practicar sin cuenta ni costos, y ciclos rápidos.

Lo que **no** reproduce fielmente: la seguridad de IAM, los límites de capacidad, la
latencia real, la durabilidad y algunos servicios o detalles de comportamiento. Un código
que funciona en el emulador debe probarse también en AWS real antes de producción.

Preguntas:
1. ¿Qué dos valores cambian al pasar de Floci a AWS real?
2. Nombra algo que podría funcionar en el emulador y fallar en AWS real.

## 9. Seguridad básica

- Nunca subas credenciales ni secretos al repositorio.
- Nunca envíes un secreto al navegador (el endpoint `/config` devuelve solo los nombres).
- Usa **URLs prefirmadas** para dar acceso temporal a un objeto privado sin exponer
  credenciales.
- Consulta siempre con parámetros (`$1, $2`), nunca concatenando texto del usuario: así se
  evita la inyección SQL.
- Valida lo que sube el usuario: tipo, tamaño y contenido (la miniatura intenta decodificar
  la imagen en lugar de confiar en la extensión).

Preguntas:
1. ¿Por qué una URL prefirmada tiene fecha de vencimiento?
2. ¿Qué riesgo hay en confiar en la extensión de un archivo subido?

## 10. Costos y buenas prácticas

- Crea una **alerta de presupuesto** antes de usar una cuenta real.
- Destruye los recursos que no uses: un recurso olvidado sigue cobrando.
- Etiqueta los recursos por proyecto y entorno para saber qué es de quién.
- Empieza en una cuenta de práctica, nunca en la de producción.
- Describe todo como código para poder borrarlo con un comando.

Preguntas:
1. ¿Qué recursos de este laboratorio podrían generar costo en AWS real si se olvidan?
2. ¿Cómo ayuda la infraestructura como código a controlar costos?

## 11. Glosario

| Término | Significado |
| --- | --- |
| Bucket | Contenedor de objetos en S3 |
| Clave (key) | Identificador de un objeto dentro de un bucket |
| Endpoint | Dirección donde responde la API de un servicio |
| Región | Ubicación geográfica con varios centros de datos |
| Zona de disponibilidad | Centro de datos aislado dentro de una región |
| IAM | Servicio de identidad y permisos |
| Política | Documento que permite o deniega acciones |
| Cola | Estructura que guarda mensajes hasta que alguien los procesa |
| Worker | Proceso que consume mensajes de una cola |
| Idempotente | Que repetirlo da el mismo resultado que hacerlo una vez |
| Stack | Grupo de recursos de CloudFormation gestionado como unidad |
| URL prefirmada | Enlace temporal con permiso incluido |
| Emulador | Software que imita la API de un servicio en local |

## Lecturas recomendadas

- Documentación de AWS: <https://docs.aws.amazon.com/>
- Modelo de responsabilidad compartida: <https://aws.amazon.com/compliance/shared-responsibility-model/>
- Las aplicaciones de 12 factores: <https://12factor.net/es/>
- Floci: <https://floci.io/aws/>

## Siguiente paso

Continúa con la [guía 01 - Puesta en marcha](01-setup.md).
