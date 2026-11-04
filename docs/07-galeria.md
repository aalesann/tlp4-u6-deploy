# 07 - Galería de imágenes con miniaturas

Esta guía es una **feature nueva** sobre la aplicación existente. La subida de archivos
(`POST /files`) no cambia: la galería se apoya en el evento que ya publica.

## Concepto: agregar una funcionalidad sin tocar el flujo existente

Cuando se sube un archivo, Express ya envía a SQS el mensaje `file.uploaded`. En la guía 04
solo lo guardábamos en MongoDB. Ahora el mismo worker, al recibirlo, **también genera una
miniatura**. El productor (la subida) no sabe que existe la galería. Esa es la ventaja de
un diseño orientado a eventos: se agregan consumidores sin modificar al productor.

```text
POST /files ──► S3 (original) + PostgreSQL (files) + SQS (file.uploaded)
                                                         │
                                                         ▼
                                   Worker ──► ¿es imagen? ──► sí: miniatura 320px
                                                         │        ├─► S3  thumbs/<clave>.webp
                                                         │        └─► PostgreSQL (thumbnails)
                                                         └─► no: se omite
GET /gallery ──► une thumbnails con files y devuelve URLs prefirmadas
```

### ¿Por qué la miniatura se genera en el worker y no al subir?

Redimensionar una imagen consume CPU. Si lo hiciera Express dentro de la petición, el
usuario esperaría y un archivo corrupto podría romper la subida. Con la cola, la subida
responde enseguida y la galería se completa unos segundos después.

### Decisiones de diseño (para discutir en clase)

- **¿Cómo sabemos que es una imagen?** No miramos la extensión (se puede falsificar):
  intentamos decodificarla con `sharp`. Si falla, no es una imagen y se omite.
- **Idempotencia:** SQS entrega *al menos una vez*. La clave de la miniatura es
  determinista (`thumbs/<clave>.webp`) y el `INSERT` usa `ON CONFLICT DO NOTHING`, así que
  procesar el mismo mensaje dos veces no duplica nada.
- **Reintentos:** si algo falla (por ejemplo S3 no responde), el worker **no borra** el
  mensaje y SQS lo vuelve a entregar. Antes un error tumbaba el proceso entero.
- **Carrera al crear tablas:** la API y el worker arrancan a la vez y ambos crean tablas.
  `CREATE TABLE IF NOT EXISTS` no es seguro frente a eso, por lo que `runSchemaMigration`
  usa un *advisory lock* de PostgreSQL. En producción esto lo resuelven las migraciones.
- **`.rotate()`:** las fotos de celular guardan la orientación en metadatos EXIF; sin
  aplicarla, la miniatura saldría girada.

## Archivos de la feature

| Archivo | Responsabilidad |
| --- | --- |
| `backend/src/thumbnails.js` | Genera la miniatura, la sube a S3 y registra la fila |
| `backend/src/gallery.js` | Ruta `GET /gallery` |
| `backend/src/worker.js` | Llama a `generateThumbnail` al recibir `file.uploaded` |
| `frontend/src/components/Gallery.jsx` | Grilla de miniaturas; clic abre el original |
| `frontend/src/components/Pipeline.jsx` | Franja que muestra el recorrido del archivo (S3, SQS, worker, miniatura) |

## Probarla

Con la aplicación levantada (API, worker y React):

1. Sube una imagen desde http://localhost:5173.
2. Mira la franja de progreso: avanza por S3, SQS, el worker y la miniatura. Cuando
   termina, la imagen aparece sola en la galería.
3. Sube un `.txt`: la franja marca la miniatura como omitida y el archivo aparece en la
   lista de archivos pero no en la galería.

Por línea de comandos:

```bash
curl -F file=@foto.jpg localhost:3000/files
curl localhost:3000/gallery
./scripts/aws.sh s3 ls s3://tlp4-uploads/thumbs/
docker exec -it tlp4-postgres psql -U tlp4 -c "SELECT * FROM thumbnails;"
```

> Si apagas el worker, las imágenes se suben igual pero la galería no las muestra. Tras
> unos 20 segundos la franja avisa que el worker no respondió. Al encenderlo, procesa lo
> acumulado y alcanza con presionar **Actualizar**, junto al título Galería, para verlo. Ese
> es el comportamiento de una cola.

## Ejercicios

1. Con el worker apagado sube tres imágenes, enciéndelo y mira el log. ¿En qué orden se
   procesan?
2. Sube una imagen más pequeña que 320 px. ¿Por qué no se agranda
   (`withoutEnlargement`)?
3. Cambia el ancho a 160 px y el formato a JPEG. ¿Las miniaturas existentes cambian?
   ¿Cómo regenerarías todas?
4. Agrega `DELETE /files/:id` que elimine también la miniatura de S3. La fila de
   `thumbnails` desaparece sola por `ON DELETE CASCADE`: ¿por qué S3 no?
5. Agrega un segundo tamaño (por ejemplo 800 px) para una vista intermedia.
6. Sube un archivo `.png` que en realidad sea texto renombrado. ¿Qué hace el sistema?
