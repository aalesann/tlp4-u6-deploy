# 03 - Configuración y secretos

## Concepto

Hay dos tipos de valores que una aplicación no debería llevar escritos en el código:

| Tipo | Ejemplo | Servicio AWS |
| --- | --- | --- |
| Configuración | un saludo, un límite, un flag | **SSM Parameter Store** |
| Secreto | clave de API, contraseña | **Secrets Manager** |

Ventajas frente a un archivo `.env` copiado a mano:

- Hay **un único lugar** para cambiar el valor y todas las instancias lo ven.
- El acceso se controla con permisos (IAM) y queda auditado.
- Los secretos no viajan en el repositorio ni en capturas de pantalla.

## Cómo lo usa la aplicación

`GET /config` en `backend/src/server.js`:

- lee el parámetro `/tlp4/app/greeting` de SSM y lo muestra como título de la página;
- lee el secreto `tlp4/app/credentials` de Secrets Manager, pero **devuelve solo los
  nombres de las claves**, nunca los valores. Un secreto jamás debe llegar al navegador.

## Con la línea de comandos

```bash
docker compose run --rm aws ssm get-parameter --name /tlp4/app/greeting
docker compose run --rm aws ssm put-parameter --name /tlp4/app/greeting --value "Hola desde la nube local" --type String --overwrite

docker compose run --rm aws secretsmanager get-secret-value --secret-id tlp4/app/credentials
```

## Ejercicios

1. Cambia el saludo con `put-parameter` y recarga la página de React. ¿Hizo falta
   reiniciar el backend? ¿Por qué?
2. Crea un secreto nuevo con `create-secret` y una clave de API inventada. Léelo desde
   el backend con un endpoint nuevo `GET /secret-check` que responda solo `{ ok: true }`.
3. Pasa la contraseña de PostgreSQL (`DATABASE_URL`) a un secreto y léela al arrancar el
   servidor, en lugar de tenerla en `config.js`.
4. Discusión: ¿por qué es un problema que `/config` devolviera `apiKey`? ¿Quién podría
   verlo?
