#!/usr/bin/env bash
# ============================================================================
#  v14-fix-service-worker.sh  — coworking-front
#
#  Problema: sw.js intentaba cachear requests de chrome-extension://
#  (extensiones del navegador) → TypeError en cada request → bloqueos.
#  Además cacheaba requests a la API → datos desactualizados / lentitud.
#
#  Fix: reemplazar sw.js por una versión que:
#    · Ignora cualquier request que no sea http/https
#    · Usa network-first para requests a la API (siempre frescos)
#    · Cache-first solo para assets estáticos del propio dominio
#    · Desregistra el SW viejo al activar para limpiar caches viejos
#
#  Uso:
#    cd coworking-front
#    chmod +x v14-fix-service-worker.sh
#    ./v14-fix-service-worker.sh
# ============================================================================
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌  Corré desde la raíz de coworking-front"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧  v14 — Fix Service Worker (bloqueos de carga)               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# ════════════════════════════════════════════════════════════════════════════
# public/sw.js — reemplazar por versión robusta
# ════════════════════════════════════════════════════════════════════════════
echo "📄  public/sw.js..."
mkdir -p public
cat > public/sw.js << 'EOF'
/**
 * sw.js — NODO Coworking PWA Service Worker
 *
 * Estrategia:
 *   · Solo procesa requests http/https (ignora chrome-extension, etc.)
 *   · API calls  → network-first, sin caché (siempre datos frescos)
 *   · Assets propios (js, css, fonts, imágenes) → cache-first con fallback
 *   · Páginas HTML → network-first con fallback al caché
 */

const CACHE_NAME = 'nodo-coworking-v2'

// Extensiones de archivo que cacheamos (solo assets estáticos)
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.png', '.svg', '.ico', '.webp', '.jpg', '.jpeg']

// Prefijos de URL que NUNCA se cachean (siempre van a la red)
const NETWORK_ONLY_PREFIXES = [
  '/api/',
  '/areas',
  '/reservas',
  '/ocupaciones',
  '/usuario',
  '/auth',
  '/admin',
]

function isHttpRequest(request) {
  return request.url.startsWith('http://') || request.url.startsWith('https://')
}

function isApiRequest(request) {
  try {
    const url = new URL(request.url)
    // Request a un dominio externo (backend) o a rutas de API
    if (url.hostname !== self.location.hostname) return true
    return NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  } catch {
    return false
  }
}

function isCacheableAsset(request) {
  try {
    const url = new URL(request.url)
    if (url.hostname !== self.location.hostname) return false
    return CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
  } catch {
    return false
  }
}

// ── Install: pre-cachear solo el shell mínimo ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/login'])
        .catch(() => { /* si falla no bloquear */ })
    )
  )
  self.skipWaiting()
})

// ── Activate: limpiar caches viejos ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: estrategia por tipo de request ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event

  // 1. Ignorar todo lo que no sea http/https (chrome-extension, etc.)
  if (!isHttpRequest(request)) return

  // 2. Solo GET — POST/PATCH/DELETE siempre a la red
  if (request.method !== 'GET') return

  // 3. API requests → network-only (sin caché, siempre frescos)
  if (isApiRequest(request)) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'Sin conexión' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    )
    return
  }

  // 4. Assets estáticos → cache-first
  if (isCacheableAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response
          }
          // Guardar en caché solo si la request es del mismo origen
          try {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          } catch { /* ignorar */ }
          return response
        }).catch(() => cached || new Response('', { status: 503 }))
      })
    )
    return
  }

  // 5. Resto (páginas HTML, etc.) → network-first con fallback al caché
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          try {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          } catch { /* ignorar */ }
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
EOF
echo "✅  public/sw.js"

# ════════════════════════════════════════════════════════════════════════════
# app/layout.tsx — limpiar console.log del SW y quitar Analytics si queda
# ════════════════════════════════════════════════════════════════════════════
echo "📄  app/layout.tsx — limpiando..."

# Quitar Analytics si todavía está (por si v13 no se corrió)
sed -i "s|import { Analytics } from \"@vercel/analytics/next\"||g" app/layout.tsx
sed -i "s|import { Analytics } from '@vercel/analytics/next'||g"   app/layout.tsx
sed -i "s|[[:space:]]*<Analytics />||g" app/layout.tsx
sed -i "s|[[:space:]]*<Analytics/>||g"  app/layout.tsx

echo "✅  app/layout.tsx"

# ════════════════════════════════════════════════════════════════════════════
# Build
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "🔨  Compilando..."
pnpm build

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  v14-fix-service-worker.sh completado                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Cambios en public/sw.js:"
echo "    · Ignora chrome-extension:// y cualquier scheme != http/https"
echo "    · API / backend → network-only (nunca caché)"
echo "    · Assets estáticos (.js .css .woff etc.) → cache-first"
echo "    · Páginas HTML → network-first con fallback"
echo "    · Limpia caches viejos al activar"
echo ""
echo "  ⚠️  IMPORTANTE: después del deploy, los usuarios deben hacer"
echo "     Ctrl+Shift+R (hard reload) UNA vez para que el nuevo SW"
echo "     reemplace al viejo. O abrir DevTools → Application →"
echo "     Service Workers → Unregister, y recargar."
echo ""