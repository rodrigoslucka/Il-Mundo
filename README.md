# Il Mundo — gestión de pizzería

Primera versión funcional para probar la operación diaria con dos modos: **Caja**, para cargar pedidos y registrar pagos, y **Cocina**, para revisar y avanzar las comandas.

## Abrir en Windows

No requiere instalar Node.js ni dependencias. En PowerShell, desde esta carpeta:

```powershell
.\start.ps1
```

Abre `http://127.0.0.1:4173` en el navegador. Para abrir la página automáticamente:

```powershell
.\start.ps1 -OpenBrowser
```

Para detener el servidor, vuelve a la ventana de PowerShell y pulsa `Ctrl+C`. Si el puerto está ocupado:

```powershell
.\start.ps1 -Port 4174
```

El servidor solo escucha en `127.0.0.1` y sirve los archivos estáticos de este proyecto; no es un backend de producción ni permite que un segundo dispositivo se conecte.

## Los dos modos

### Caja

- La pantalla mantiene la fecha, el acceso a la caja y los modos de trabajo; **Nuevo pedido** queda destacado al centro.
- Pulsa **Nuevo pedido** y elige **En mesa** o **Para llevar**. La carta presenta por separado pizzas y bebidas, sin buscador; al elegir un producto, una ventana flotante permite seleccionar cantidad y tamaño. Las pizzas solo ofrecen **Mediana** y **Grande**; las bebidas se agregan por unidad, sin selector de tamaño. Si un producto tiene varias presentaciones guardadas, la unidad usa su primer precio configurado; puedes cambiarlo a un único precio por unidad desde Menú.
- En **En mesa** se elige una mesa; en **Para llevar** se indica el nombre del pedido. Ambos modos permiten solo pizzas y bebidas y requieren indicar el medio de pago previsto. Seleccionarlo no registra el cobro: el pago se confirma por separado cuando la comanda está lista.
- El pedido aparece en la lista del día. Desde allí se ve su estado y, cuando esté listo, se registra el pago recibido: **Efectivo** o **QR**. La comanda indica el medio anotado; crear el pedido no lo marca como pagado.
- Abrir un turno de caja es opcional para cargar comandas, pero necesario para registrar cobros. El cierre resume el total generado y lo desglosa en Efectivo y QR; también conserva el arqueo de efectivo contado, esperado y su diferencia.
- Caja y Cocina se cambian desde la barra de navegación fija en el pie de página, tanto en escritorio como en celulares.

### Cocina

- Las comandas aparecen como tarjetas de cuatro columnas en pantallas grandes, ordenadas por prioridad. Azul indica pedidos en mesa; rojo, pedidos para llevar.
- Las tarjetas son cuadradas: muestran el número del pedido, “Nueva orden” y la mesa o modalidad; azul indica pedidos en mesa y rojo, pedidos para llevar.
- Toca una tarjeta para abrir una ventana con la pizza y su tamaño destacados, además de extras y notas necesarios para prepararla.
- Al llegar una comanda, Cocina reproduce un aviso corto de dos tonos. El navegador permite el sonido después de la primera interacción con la app.
- Pulsa **Completar pedido** (o **Marcar como entregado** si ya está listo). Desaparecerá de Cocina, pero seguirá guardado como pedido completado en Caja. Completarlo no registra automáticamente un pago; el cobro se anota aparte en Caja.

También puedes instalar la PWA desde el navegador. Los datos de ejemplo y la configuración se guardan únicamente en este dispositivo.

## Estructura del proyecto

- `src/app.js`: interfaz, navegación y acciones de la aplicación.
- `src/data.js`: estado inicial, validación, persistencia y reglas de datos compartidas.
- `src/features/cash/`: pantalla de caja, cálculos compartidos y generación del archivo Excel.
- `src/styles.css`: estilos de la aplicación.
- `src/diagnostics.js`: manejo visible de errores de inicio y ejecución.
- `assets/`: iconos e ilustraciones.
- `index.html`, `sw.js` y `manifest.webmanifest`: entrada web y configuración de la PWA.

La aplicación no tiene dependencias de compilación: cada función de dominio vive en módulos ES nativos para que puedan extraerse o probarse por separado al crecer el proyecto.

## Exportar el balance de caja

En **Caja**, usa **Exportar Excel** para descargar un archivo `.xlsx` con dos hojas: **Resumen**, que incluye los turnos y su arqueo, y **Movimientos**, con cada pago registrado. Se exportan todos los turnos almacenados en este navegador; el archivo no se envía a un servidor.

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

El despliegue publica la interfaz, pero no cambia cómo se almacenan los datos: pedidos y caja siguen guardándose localmente en cada navegador y no se sincronizan entre dispositivos. No uses datos reales ni consideres esta demo un sistema de producción.

## Estado y límites de esta primera versión

- Es una **demostración local**, no una herramienta autorizada para cobrar o gestionar ventas reales. Los perfiles no son cuentas, los permisos no los aplica un servidor y los datos no se sincronizan con otros celulares.
- Los productos, precios, moneda, envío y mesas iniciales son **datos de ejemplo**. Las dos vistas operativas usan estos valores de muestra.
- Los datos del navegador pueden borrarse. Descarga respaldos con cuidado: pueden incluir nombres, teléfonos y direcciones si los utilizas para hacer pruebas.
- El modo sin conexión funciona después de abrir la aplicación desde su dirección local. Los cambios guardados sin internet no se envían a ningún servidor.
- Al publicar cambios de código, actualiza las versiones de recursos de `index.html` y el `CACHE_NAME` y las rutas de recursos de `sw.js`. Así, la versión sin conexión y la versión en línea avanzan juntas.
- La carta, los pedidos, la cocina, el plano de mesas y los cierres permiten ensayar los flujos del MVP. No hay inventario enlazado, integración de pagos, facturación, pedidos públicos por internet ni cálculo de costos reales.

El plan recomienda React, TypeScript y Supabase. Para empezar a probar sin instalar herramientas de desarrollo, esta entrega es una PWA sin dependencias, con almacenamiento local y un servidor de prueba para Windows. **Antes de la puesta en producción** se debe incorporar el backend previsto: autenticación real, permisos por rol validados en servidor, base de datos, sincronización en tiempo real, copias de seguridad y despliegue con TLS. Este servidor local no sustituye esos componentes.
