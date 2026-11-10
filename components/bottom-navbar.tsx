"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Armchair, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Coworking",  href: "/",           icon: Armchair     },
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
]

const isItemActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href)

/**
 * Dock flotante de vidrio (glass) con indicador deslizante.
 * El indicador es una "píldora" azul NODO que se desplaza con un rebote suave
 * hacia la pestaña activa; los íconos se elevan al pasar el mouse.
 */
export function BottomNavbar() {
  const pathname = usePathname()
  const activeIndex = navItems.findIndex((item) => isItemActive(pathname, item.href))

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {/* Halo de color detrás del dock */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-3 -top-1 -z-10 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(38,167,252,0.35), rgba(38,167,252,0) 70%)",
        }}
      />

      <div
        className={cn(
          "relative flex items-center rounded-[22px] p-1.5",
          "border border-white/60 bg-white/60 dark:border-white/10 dark:bg-slate-900/55",
          "backdrop-blur-2xl backdrop-saturate-200",
        )}
        style={{
          boxShadow: [
            "0 12px 36px rgba(38,167,252,0.16)",
            "0 4px 12px rgba(15,23,42,0.08)",
            "inset 0 1px 0 rgba(255,255,255,0.85)",
            "inset 0 -1px 0 rgba(15,23,42,0.04)",
          ].join(", "),
        }}
      >
        {/* Indicador deslizante */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute bottom-1.5 left-1.5 top-1.5 rounded-2xl motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.75rem) / ${navItems.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
              transition: "transform 420ms cubic-bezier(0.34, 1.45, 0.64, 1)",
              background: "linear-gradient(135deg, #3db4ff 0%, #26a7fc 45%, #1b8de0 100%)",
              boxShadow: [
                "0 6px 18px rgba(38,167,252,0.45)",
                "0 1px 3px rgba(27,141,224,0.4)",
                "inset 0 1px 0 rgba(255,255,255,0.45)",
              ].join(", "),
            }}
          />
        )}

        {navItems.map(({ label, href, icon: Icon }, i) => {
          const active = i === activeIndex

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative z-10 flex min-w-[140px] flex-1 basis-0 items-center justify-center gap-2 rounded-2xl px-5 py-2.5",
                "text-sm tracking-wide outline-none transition-colors duration-300",
                "focus-visible:ring-2 focus-visible:ring-[#26a7fc]/60 focus-visible:ring-offset-2",
                active
                  ? "font-semibold text-white"
                  : "font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "scale-110"
                    : "group-hover:-translate-y-0.5 group-hover:scale-110 group-active:scale-95",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
