"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Armchair, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Coworking",   href: "/",            icon: Armchair     },
  { label: "Calendario",  href: "/calendario",  icon: CalendarDays },
]

export function BottomNavbar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="flex items-center gap-1 px-3 py-2 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.18)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.45)",
          boxShadow:
            "0 8px 32px rgba(38,167,252,0.10), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.55)",
        }}
      >
        {navItems.map(({ label, href }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all duration-200 min-w-[72px]",
                isActive ? "text-[#26a7fc]" : "text-slate-500"
              )}
            >
              {/* Hover encuadre */}
              <span
                className={cn(
                  "absolute inset-0 rounded-xl transition-all duration-200",
                  isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                )}
                style={{
                  background: "rgba(38,167,252,0.07)",
                  border: "1px solid rgba(38,167,252,0.18)",
                }}
              />

              {/* Active background */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(38,167,252,0.12)",
                    border: "1px solid rgba(38,167,252,0.22)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                />
              )}

              <span
                className={cn(
                  "relative text-xs font-medium tracking-wide transition-all duration-200",
                  isActive
                    ? "font-semibold text-[#26a7fc]"
                    : "text-slate-500 group-hover:text-slate-700"
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
