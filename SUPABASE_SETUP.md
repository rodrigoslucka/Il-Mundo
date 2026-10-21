# Configurar autenticación y sincronización de Il Mundo

## Estado

- La migración `supabase/migrations/20261021000100_secure_workspace.sql` ya se ejecutó en el proyecto Supabase asociado a esta app.
- La función Edge `admin-users` ya está desplegada. Verifica el usuario con Supabase Auth y reserva las operaciones privilegiadas para administradores. La opción de validación JWT heredada está desactivada tanto en el panel como en `supabase/config.toml`, para que futuras publicaciones no dependan de la clave JWT legacy.
- El navegador usa únicamente la configuración pública de [src/supabase-config.js](./src/supabase-config.js). El archivo no debe contener claves secretas.
- Falta crear la primera cuenta administradora, configurar el correo saliente y publicar la app actualizada en Vercel. Hasta entonces, la app local muestra el inicio de sesión, pero no se podrá iniciar sesión con una cuenta inexistente.

## Archivo de configuración del navegador

La URL y la clave `sb_publishable_...` están en `src/supabase-config.js`, separadas del resto del código. La clave publishable/anon es pública por diseño y puede estar en el frontend; la seguridad depende de Auth y de las políticas PostgreSQL/RLS.

Si cambias de proyecto, sustituye allí `SUPABASE_URL` y `SUPABASE_PUBLIC_KEY` por los valores de **Project Settings → API Keys**. No copies una clave `sb_secret_...`, `service_role` ni una contraseña a ese archivo, a Vercel, GitHub o el chat. No hay una clave privada que añadir al frontend.

La función desplegada usa las variables administradas de Supabase Functions (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`). No se incluyó ni se necesita una clave secreta en el repositorio. Si Supabase no proporciona la variable de servicio automáticamente, configúrala como secreto desde **Edge Functions → Secrets**; nunca la pegues en el código del navegador.

## Crear la primera cuenta administradora

1. En Supabase abre **Authentication → URL Configuration** y añade las direcciones locales y de producción a **Redirect URLs**. La dirección local de esta prueba es `http://127.0.0.1:4173/**`; añade también el dominio Vercel una vez creado.
2. Configura correo saliente confiable en **Authentication → SMTP Settings** antes de invitar al cliente. El envío predeterminado de Supabase tiene límites bajos para pruebas; un SMTP propio evita depender del envío compartido.
3. Ve a **Authentication → Users → Invite user** e invita el correo del primer administrador. El trigger de la migración rechaza el registro público directo y solo crea perfiles de cuentas invitadas.
4. Cuando la invitación figure en la lista, vuelve al **SQL Editor** y asigna el primer rol administrador. Sustituye el correo por el de esa cuenta:

   ```sql
   update public.il_mundo_profiles
   set role = 'admin'
   where user_id = (
     select id from auth.users
     where lower(email) = lower('admin@ejemplo.com')
   );
   ```

   Comprueba que el resultado afectó una fila. Si no afectó ninguna, no continúes: verifica que la invitación se aceptó y que existe el perfil.
5. La persona acepta la invitación, establece su contraseña e inicia sesión. La primera cuenta administradora crea el estado inicial compartido (menú de ejemplo) al abrir la app.

Después, el administrador podrá invitar cuentas desde **Configuración → Usuarios y roles**, cambiar sus roles y revocarlas. Las invitaciones requieren el SMTP configurado. La app no ofrece registro público.

## Publicar en Vercel

1. Sube los cambios del repositorio a GitHub sin añadir secretos.
2. En Vercel importa `rodrigoslucka/Il-Mundo`. Selecciona la raíz del repositorio, framework **Other**, sin comando de build y con directorio de salida `.`.
3. La configuración de Supabase ya está en `src/supabase-config.js`; Vercel no necesita una variable privada. Publica y agrega el dominio asignado en **Authentication → URL Configuration → Redirect URLs** de Supabase.
4. Abre la URL de producción e inicia sesión. No consideres el sistema listo para datos reales hasta completar las pruebas de roles indicadas abajo.

## Comprobaciones de permisos

- Como administrador, confirma que aparecen Menú, Usuarios y roles, Caja y exportación.
- Invita una cuenta Trabajador y acepta la invitación en otro navegador/dispositivo.
- Como trabajador, confirma que solo aparece Pedidos; crea un pedido y cambia su estado.
- Comprueba que el nuevo pedido aparece en tiempo real en el otro dispositivo.
- Como trabajador, intenta acceder a Caja/Configuración por URL y confirma que la app lo rechaza. Las escrituras se vuelven a validar en PostgreSQL; ocultar pantallas no es el control de seguridad.
- Como administrador, comprueba que el pedido incrementó la caja abierta, cambia un producto y confirma que el menú se sincroniza.
- Prueba cerrar sesión, recuperar contraseña y volver a iniciar sesión.

Las escrituras necesitan conexión; no se almacenan cambios sin conexión para sincronizarlos luego. Los datos de demostración que existían en `localStorage` no se suben automáticamente ni se borran. El primer estado remoto se crea con el menú de ejemplo; exporta y revisa cualquier respaldo local antes de decidir importar datos reales.

El plan gratuito sirve para la prueba del cliente, pero tiene límites de uso y puede pausar proyectos con poca actividad. Revisa las cuotas vigentes de Supabase y del proveedor SMTP antes de depender de él para la operación diaria.

## Claves y seguridad

- `src/supabase-config.js` contiene exclusivamente la URL y la clave publishable/anon, que son valores públicos.
- No crees un `.env` servido por Vercel con una clave `sb_secret_...` o `service_role`; no es necesaria para la aplicación estática.
- El secreto de servicio, si alguna vez hay que configurarlo, pertenece únicamente a los secretos de Supabase Edge Functions. Nunca lo incluyas en archivos versionados.
- La clave `sb_secret_...` compartida anteriormente se confirmó revocada. No la reutilices.
- La base separa el estado de Caja y lo permite leer solo a administradores; RLS limita el acceso y las funciones PostgreSQL validan las operaciones de trabajadores.
