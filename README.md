# Fiesta Brava

Una aplicación Next.js para el sitio público y su panel privado. Ambas áreas consultan las mismas tablas de Supabase; no hay un segundo proyecto ni credenciales privilegiadas en el navegador.

## Puesta en marcha

1. Instala Node.js 20.9 o posterior.
2. Ejecuta `npm install` y copia `.env.example` a `.env.local`.
3. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los datos del proyecto Supabase.
4. Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase.
5. Registra el primer usuario desde Supabase Auth y ejecuta la consulta de bootstrap comentada al final de `schema.sql` con su correo. Los siguientes usuarios pueden registrarse y el administrador cambia su rol/estado en «Usuarios y permisos».
6. Ejecuta `npm run dev`.

El acceso privado usa `/${ADMIN_PATH}`; por defecto es `/admin-la-fiesta`. Configura `ADMIN_PATH` sin barras iniciales/finales antes de iniciar Next.js. El middleware protege la ruta, comprueba la sesión Supabase y deniega perfiles inactivos. RLS vuelve a validar rol y permisos en cada consulta.

## Datos y publicación

`src/lib/data.ts` es la capa tipada de consultas que alimenta el sitio público. Visitantes solo reciben filas activas, visibles y no archivadas. Las ediciones guardan `updated_at` y `updated_by`; las eliminaciones se archivan. Al guardar se invalida la etiqueta `public-menu` y el sitio se revalida bajo demanda (además de la ventana de caché de 60 segundos).

La edición y publicación del menú, categorías, variantes, combos, promociones, horarios, galería, configuración comercial, redes y pagos está disponible desde el panel. La entidad «Elementos de combos» dispone también de esquema; para enlazar elementos con combos/productos usa sus UUID. El panel crea contenido como oculto hasta que se active «Visible en el sitio público».

## Imágenes

El esquema crea el bucket público `fiesta-media`, permite lecturas públicas y restringe las cargas y eliminaciones a editores/administradores. Usa URLs públicas del bucket en los campos de imagen.

## Seguridad y límites

- La clave anónima de Supabase puede estar en `NEXT_PUBLIC_`; RLS limita cada tabla.
- `SUPABASE_SERVICE_ROLE_KEY` es solo servidor y no se usa en el flujo habitual del sitio.
- El primer administrador se activa mediante SQL de bootstrap. Los nuevos registros quedan inactivos hasta ser autorizados; el admin cambia roles/estados en la lista de usuarios (las cuentas se crean desde Supabase Auth).
- El rol editor administra contenido; únicamente el admin modifica configuración comercial y perfiles.
- `robots.ts` excluye la ruta privada y `sitemap.ts` solo declara la página pública.
