# Fiesta Brava · GitHub Pages

Esta rama (`githubpages`) contiene la versión pública estática del sitio. El menú, productos, precios, variantes, combos, promociones, horarios, galería, dirección, WhatsApp y métodos de pago se consultan directamente desde las mismas tablas de Supabase. El navegador vuelve a consultar cada 30 segundos y al regresar a la pestaña.

## Publicar en GitHub Pages

1. Publica esta rama en el repositorio `mgnsoftware/FiestaBrava`.
2. En **Settings → Pages**, selecciona **GitHub Actions** como origen.
3. En **Settings → Secrets and variables → Actions → Variables**, crea:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto activo `fiestaBrava`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave `sb_publishable_...` del proyecto.
4. Cada push a `githubpages` ejecuta el workflow y publica en `https://mgnsoftware.github.io/FiestaBrava/`.

La clave publishable es pública por diseño. Row Level Security debe permanecer habilitado: los visitantes solo pueden leer registros activos, visibles y no archivados. Nunca agregues `SUPABASE_SERVICE_ROLE_KEY` a esta rama ni a variables públicas.

## Desarrollo local

Usa Node.js 20.9 o posterior, instala dependencias con `npm ci`, copia `.env.example` a `.env.local` y define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Después inicia con `npm run dev`.

La app no incluye el panel administrativo en esta rama porque GitHub Pages solo sirve archivos estáticos y no puede ejecutar middleware ni Server Actions. La versión con panel protegido permanece en `main`. Administra el contenido desde esa versión; los cambios publicados en Supabase se reflejan aquí en un máximo aproximado de 30 segundos.

El proyecto Supabase activo no contiene todavía productos ni precios publicados. El sitio mostrará automáticamente los registros que se creen y se marquen como activos y visibles.
