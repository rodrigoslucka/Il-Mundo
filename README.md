# Il Mundo — gestión de pizzería

Aplicación web para gestionar pedidos, cocina, menú, usuarios y cierres de caja. La app usa Supabase para autenticación, roles y sincronización entre dispositivos. Consulta [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para preparar la primera cuenta y completar la publicación.

## Abrir en Windows

No requiere instalar Node.js ni dependencias. En PowerShell, desde esta carpeta:

```powershell
.\start.ps1
```

Abre `http://127.0.0.1:4173` en el navegador. El inicio de sesión necesita conexión a Supabase y una cuenta invitada. Para abrir la página automáticamente:

```powershell
.\start.ps1 -OpenBrowser
```

Para detener el servidor, vuelve a la ventana de PowerShell y pulsa `Ctrl+C`. Si el puerto está ocupado:

```powershell
.\start.ps1 -Port 4174
```

El servidor solo escucha en `127.0.0.1` y sirve los archivos estáticos. La base de datos y la autenticación están alojadas en Supabase; este servidor local no es el backend.

## Los dos modos

### Caja

- La pantalla mantiene la fecha, el acceso a la caja y los modos de trabajo; **Nuevo pedido** queda destacado al centro.
- Pulsa **Nuevo pedido** y elige **En mesa** o **Para llevar**. La carta presenta pizzas y bebidas; al elegir un producto, una ventana flotante permite seleccionar cantidad y presentación.
- En **En mesa** no se indica número de mesa; desde **Mesas** todavía puedes iniciar una comanda asociada a una mesa específica. En **Para llevar** se indica el nombre del pedido. Ambos modos permiten solo pizzas y bebidas y requieren elegir el medio de pago antes de confirmar.
- Antes de enviar la comanda se elige el medio de pago y se confirma que el pago ya fue recibido. La app lo registra automáticamente y, si hay un turno de Caja abierto, lo suma al balance; ya no hay botones posteriores para cobrar o confirmar la entrega.
- Abre un turno de Caja antes de confirmar pedidos para incluir automáticamente sus pagos. El cierre resume el total generado y lo desglosa en Efectivo y QR; también conserva el arqueo de efectivo contado, esperado y su diferencia.
- En **Configuración**, la pestaña **Menú** permite administrar pizzas y bebidas en listas separadas, agregar, editar o borrar productos, y añadir o quitar presentaciones y precios de cada producto. Al tomar un pedido se pueden elegir las presentaciones que estén configuradas. La pestaña **Usuarios y roles** permite al administrador invitar cuentas, cambiar roles y revocarlas. No se gestionan ingredientes ni stock.
- Los trabajadores acceden a **Pedidos**; el administrador también puede entrar a Cocina, Caja y Configuración. Auth, políticas RLS y funciones PostgreSQL aplican los permisos en el backend.

### Cocina

- Las comandas aparecen como tarjetas de cuatro columnas en pantallas grandes, ordenadas por prioridad. Azul indica pedidos en mesa; rojo, pedidos para llevar.
- Las tarjetas son cuadradas: muestran el número del pedido, “Nueva orden” y la mesa o modalidad; azul indica pedidos en mesa y rojo, pedidos para llevar.
- Toca una tarjeta para abrir una ventana con la pizza y su tamaño destacados, además de extras y notas necesarios para prepararla.
- Al llegar una comanda, Cocina reproduce un aviso corto de dos tonos. En cada dispositivo, pulsa **Activar sonido** una vez para permitir la reproducción; deja la aplicación abierta para recibir avisos de nuevos pedidos.
- Pulsa **Pedido finalizado** para marcar la comanda como lista: en Caja aparecerá un aviso verde con un sonido distinto. La orden seguirá visible en Caja como lista; no hay que confirmar después la entrega.

También puedes instalar la PWA desde el navegador. Pedidos, menú y cuentas se comparten entre dispositivos conectados; los cambios requieren conexión a internet. Los datos de demostración anteriores guardados en `localStorage` no se migran automáticamente.

Los precios se muestran en bolivianos (Bs). Los datos existentes configurados en dólares se actualizan a bolivianos sin cambiar los importes guardados.

## Estructura del proyecto

- `src/app.js`: interfaz, navegación y acciones de la aplicación.
- `src/backend.js`: autenticación, sincronización y suscripción Realtime de Supabase.
- `src/supabase-config.js`: URL del proyecto y clave pública publishable.
- `src/data.js`: estado inicial, validación, persistencia y reglas de datos compartidas.
- `src/features/cash/`: pantalla de caja, cálculos compartidos y generación del archivo Excel.
- `src/styles.css`: estilos de la aplicación.
- `src/diagnostics.js`: manejo visible de errores de inicio y ejecución.
- `assets/`: iconos e ilustraciones.
- `index.html`, `sw.js` y `manifest.webmanifest`: entrada web y configuración de la PWA.

La aplicación no tiene dependencias de compilación: usa módulos ES nativos y carga el cliente de Supabase desde `esm.sh`.

## Exportar el balance de caja

Al cerrar Caja se descarga automáticamente un archivo `.xlsx` con dos hojas: **Resumen**, que incluye los turnos y su arqueo, y **Movimientos**, con cada pago registrado. Desde **Menú**, el administrador también puede exportar un archivo diario con las ventas pagadas de hoy y su detalle por pedido. La Caja está restringida a administradores.

## Desplegar en Vercel

El proyecto es un sitio estático y ya incluye `vercel.json`; no necesita instalar paquetes ni ejecutar un proceso de compilación. El repositorio GitHub previsto es [rodrigoslucka/Il-Mundo](https://github.com/rodrigoslucka/Il-Mundo). Una vez publicado el código, impórtalo en Vercel con la raíz del proyecto como directorio. Vercel servirá `index.html` y los recursos de `src/` y `assets/`. El plan PDF del proyecto se excluye del despliegue mediante `.vercelignore`.

Para publicar desde Windows, instala Git, inicia sesión en GitHub y ejecuta estos comandos en PowerShell desde la carpeta del proyecto:

```powershell
cd "C:\Users\Mi_Pc\Documents\Il Mundo"
git init
git add .
git commit -m "Initial commit: Il Mundo"
git branch -M main
git remote add origin https://github.com/rodrigoslucka/Il-Mundo.git
git push -u origin main
```

Si prefieres desplegar desde la terminal después de iniciar sesión en Vercel CLI:

```powershell
vercel --prod
```

El despliegue publica la interfaz; la sincronización y los permisos se gestionan en Supabase. Sigue [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para completar los ajustes de Auth, crear el primer administrador, desplegar y probar los permisos. No des por terminada la puesta en producción hasta completar esas comprobaciones.

## Estado y límites de esta primera versión

- La interfaz y el backend están preparados para sincronizar datos y aplicar permisos por rol. La activación para uso real depende de la creación del administrador inicial, configuración de SMTP, publicación en Vercel y pruebas de permisos en ambos roles.
- Los productos, precios, envío y mesas iniciales son **datos de ejemplo**; los precios se expresan en bolivianos (Bs). Las dos vistas operativas usan estos valores de muestra.
- Los datos del navegador pueden borrarse. Descarga respaldos con cuidado: pueden incluir nombres, teléfonos y direcciones si los utilizas para hacer pruebas.
- La app requiere internet para iniciar sesión y guardar/sincronizar cambios; no pone en cola escrituras sin conexión.
- Al publicar cambios de código, actualiza las versiones de recursos de `index.html` y el `CACHE_NAME` y las rutas de recursos de `sw.js`. Así, la versión sin conexión y la versión en línea avanzan juntas.
- La carta, los pedidos, la cocina, el plano de mesas y los cierres permiten ensayar los flujos del MVP. No hay inventario enlazado, integración de pagos, facturación, pedidos públicos por internet ni cálculo de costos reales.

Supabase proporciona Auth, base de datos PostgreSQL con RLS y sincronización Realtime; Vercel sirve la interfaz estática con TLS. Los límites y pasos de configuración del backend están documentados en [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
