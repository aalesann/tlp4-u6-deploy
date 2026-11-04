# 04 - SQS: colas y trabajo asíncrono

## Concepto

Imagina que al subir un archivo hay que generar miniaturas, enviar un email y avisar a
otro sistema. Si Express hace todo eso antes de responder, el usuario espera y cualquier
falla rompe la subida.

Con una **cola** (SQS) el servidor solo deja un mensaje y responde enseguida. Otro
proceso, el **worker**, lo toma y hace el trabajo cuando puede.

```text
Express ──► [ cola SQS ] ──► Worker ──► MongoDB
 (rápido)    (buffer)       (a su ritmo)
```

Ventajas: respuestas rápidas, el worker se puede caer sin perder trabajo, y se pueden
agregar más workers si hay mucha carga.

### Ideas clave

- **Long polling:** `WaitTimeSeconds: 10` hace que el worker espere hasta 10 segundos por
  mensajes en vez de consultar sin parar.
- **Borrar después de procesar:** un mensaje recibido queda *invisible* un tiempo. Si el
  worker no lo borra (`DeleteMessage`), SQS lo vuelve a entregar. Así no se pierde trabajo
  si el worker falla a mitad.
- **Al menos una vez:** un mensaje puede llegar repetido. Un buen worker debe tolerarlo.

## Cómo lo usa la aplicación

- Productor: `POST /files` envía `{ type: "file.uploaded", key, name }`.
- Consumidor: `backend/src/worker.js` lo recibe, lo guarda en la colección `events` de
  MongoDB y borra el mensaje.
- `GET /events` lista esos eventos y React los muestra.

## Con la línea de comandos

```bash
URL=http://localhost:4566/000000000000/tlp4-events
./scripts/aws.sh sqs send-message --queue-url $URL --message-body '{"type":"manual","name":"prueba"}'
./scripts/aws.sh sqs get-queue-attributes --queue-url $URL --attribute-names ApproximateNumberOfMessages
```

## Ejercicios

1. Con el worker **apagado**, sube tres archivos. Revisa cuántos mensajes hay en la cola
   con `get-queue-attributes`. Enciende el worker y observa cómo se vacía.
2. Haz que el worker falle a propósito (`throw new Error("boom")` antes del
   `DeleteMessage`). El worker captura el error, lo escribe en el log y sigue vivo. ¿Qué
   pasa con el mensaje? ¿Cuándo reaparece? ¿Qué ocurriría con un `try/catch` que sí
   borrara el mensaje?
3. Evita duplicados: usa `key` como identificador único en MongoDB y comprueba que
   procesar dos veces el mismo mensaje no crea dos eventos.
4. Levanta dos workers a la vez en terminales distintas y sube varios archivos. ¿Cómo se
   reparten los mensajes?
