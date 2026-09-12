# Acceso, primer administrador y recuperación

## Estado de las verificaciones

La migración `0001_auth_assignment.sql` se aplicó a D1 de producción el 12 de septiembre de 2026. La comparación con el backup anterior confirma que los 19 partes y los 18 registros de fotos conservan todos sus valores originales. Los 19 partes quedaron sin asignar, las referencias son válidas y no se creó ningún usuario de producción.

La integración se ha probado desde una previsualización privada de Cloudflare contra Supabase real. Las credenciales de prueba se generan exclusivamente en memoria; no se imprimen ni se escriben en archivos. Se han comprobado las dos API keys, registro público desactivado, alta ficticia, inicio de sesión, identidad, cierre de sesión, restablecimiento de contraseña, rechazo de la anterior y eliminación confirmada de la cuenta ficticia.

La verificación del primer administrador también se ha probado con esa cuenta ficticia: acepta su UUID/correo confirmado y rechaza un correo diferente. La creación única en D1 se prueba sobre SQLite aislado, no sobre producción. Las sesiones locales y permisos de casos se prueban con proveedores simulados y usuarios ficticios; no se presenta esa prueba como una sesión real de producción.

## Primer administrador: procedimiento privado

No ejecutar hasta que la migración aditiva de autenticación esté aplicada y se haya coordinado la puesta en producción. No existe un endpoint público de alta de administrador.

1. En el proyecto correcto de Supabase, abrir **Authentication → Users → Add user → Create new user**.
2. Introducir personalmente el correo y una contraseña privada de al menos 15 caracteres, con mayúscula, minúscula, número y símbolo. Confirmar el correo mediante la opción de confirmación del panel. No enviar la contraseña al asistente ni guardarla en archivos del proyecto.
3. Copiar el **User UID** de esa cuenta. El correo, UUID y nombre de usuario son los únicos datos de identidad necesarios para vincularla a D1. Ninguna contraseña se copia a D1.
4. En una terminal privada, desde la carpeta del proyecto, ejecutar `node scripts/bootstrap-admin.mjs`. Wrangler debe tener una sesión válida en la cuenta de Cloudflare.
5. Introducir usuario de acceso, correo, nombre visible y User UID cuando se soliciten. Confirmar escribiendo `CREAR`. El programa nunca pide la contraseña.
6. El programa verifica primero la identidad en Supabase usando una previsualización privada sin D1 ni R2. Si no coincide, no modifica D1. Después vincula la cuenta como administrador mediante la CLI autenticada de Cloudflare. El índice y los triggers de D1 impiden una segunda creación inicial.
7. Iniciar sesión en la aplicación con el usuario elegido y la contraseña introducida personalmente en Supabase. Crear trabajadores desde **Trabajadores** y asignar los partes existentes; inicialmente estarán sin asignar y solo serán visibles para el administrador.

Si el programa informa de un resultado incierto, revisar D1 antes de repetir. No borrar `bootstrap_state` ni desactivar los triggers para repetir el alta. No hay contraseña predeterminada ni administrador generado automáticamente.

## Backup y restauración

El backup SQL privado de D1 se guarda bajo `.wrangler/backups/`, excluido de Git. Su manifiesto contiene SHA-256, recuentos y huellas de las filas originales, sin contenido de los partes. El SQL contiene datos personales: no copiarlo a `dist`, al repositorio ni a un archivo público.

`node scripts/verify-backup.mjs RUTA_DEL_BACKUP.sql` restaura el SQL en una base SQLite aislada en memoria, ejecuta `PRAGMA integrity_check`, prueba la migración aditiva y comprueba las referencias. No conecta con D1 de producción.

Para comparar con un export posterior: `node scripts/verify-backup.mjs BACKUP_ANTERIOR.sql EXPORT_POSTERIOR.sql`. Compara todas las columnas originales de `cases` y `case_photos`, ordenadas por ID, y falla si difieren sus valores.

En una recuperación real, restaurar primero el SQL en **otra base D1 vacía**, usando `wrangler d1 execute NOMBRE_BASE_RECUPERACION --remote --file RUTA_DEL_BACKUP.sql`. Verificar datos y referencias antes de cambiar el binding de producción. No importar el backup directamente sobre una base con datos ni ejecutar comandos de borrado para hacer sitio.

El backup D1 conserva las referencias de fotos y firmas; **no contiene los objetos binarios de R2**. La recuperación completa requiere conservar el bucket original o disponer de su copia separada. Estas pruebas no modifican el bucket original.

## Antes de producción

- Obtener un backup D1 reciente y verificarlo antes de aplicar `migrations/0001_auth_assignment.sql`.
- Aplicar exclusivamente esa migración aditiva y comparar los datos originales con un export posterior.
- Ejecutar las pruebas automatizadas, de navegador y el build. Las pruebas de navegador requieren Playwright/Edge y usan únicamente datos ficticios.
- Publicar solo la versión aprobada, conservando los Runtime Secrets. Crear el administrador mediante el procedimiento anterior y comprobar una sesión de extremo a extremo en la aplicación publicada.
- El alta real del administrador, la asignación inicial de partes y la comprobación final de esa sesión siguen siendo pasos de puesta en servicio; las pruebas ficticias no los sustituyen.

Supabase se usa únicamente para credenciales e identidad. D1 contiene usuarios locales, roles, asignaciones, sesiones de ocho horas, intentos y auditoría. R2 conserva fotos y firmas. El backend comprueba permisos; el navegador no decide el rol.
