# 05 - Bases de datos: PostgreSQL y MongoDB

## Concepto

En este laboratorio las dos bases son contenedores comunes (no servicios de AWS), y cada
una guarda lo que mejor le calza:

| Base | Qué guarda aquí | Por qué |
| --- | --- | --- |
| PostgreSQL | Tabla `files` (clave en S3, nombre, tamaño, fecha) y tabla `thumbnails` (miniatura de cada imagen, ver guía 07) | Datos con estructura fija, relaciones entre tablas y consultas con filtros y orden |
| MongoDB | Colección `events` (eventos de la cola) | Documentos con forma variable: cada tipo de evento puede traer campos distintos |

En la nube real, el equivalente administrado sería **RDS** (PostgreSQL) y **DocumentDB**
o **Atlas** (MongoDB). Lo que cambia es el *connection string*; el código es el mismo.

> Si tu cursada usa solo una de las dos bases, puedes reemplazar la otra: la tabla `files`
> puede ser una colección y los eventos pueden guardarse en una tabla.

## Cómo lo usa la aplicación

- `backend/src/db.js` crea la tabla `files` al arrancar (`CREATE TABLE IF NOT EXISTS`).
  La API y el worker arrancan a la vez, así que la creación se hace bajo un *advisory
  lock* de PostgreSQL (`runSchemaMigration`); sin él, dos procesos creando la misma tabla
  al mismo tiempo pueden fallar. En proyectos reales esto lo resuelven las migraciones.
- La tabla `thumbnails` referencia a `files` con una clave foránea y `ON DELETE CASCADE`:
  al borrar un archivo, su fila de miniatura desaparece sola.
- `DATABASE_URL` y `MONGO_URL` se leen de `config.js` y se pueden sobrescribir con
  variables de entorno. Ese es el "cambio de endpoint" para las bases.
- Las consultas usan parámetros (`$1, $2, $3`) y nunca concatenan texto del usuario:
  así se evita la inyección SQL.

## Con la línea de comandos

```bash
docker exec -it tlp4-postgres psql -U tlp4 -c "SELECT id, original_name, size_bytes FROM files;"
docker exec -it tlp4-mongo mongosh tlp4 --eval "db.events.find().pretty()"
```

## Ejercicios

1. Sube un archivo y verifica que existe una fila en PostgreSQL, un objeto en S3 y, con el
   worker activo, un documento en MongoDB. ¿Qué pasa con los otros dos si falla el
   segundo paso? Describe el problema de consistencia entre sistemas.
2. Agrega `DELETE /files/:id` que borre el objeto de S3 y la fila de PostgreSQL. ¿En qué
   orden conviene hacerlo y por qué?
3. Agrega una columna `mime_type` a `files`. ¿Cómo la agregarías sin perder los datos
   existentes?
4. Agrega un índice en MongoDB sobre `processedAt` y comprueba la consulta con `explain()`.
