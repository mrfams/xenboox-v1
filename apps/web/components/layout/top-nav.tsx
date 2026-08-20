"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Menu, LogOut, User, Bell } from "lucide-react"
import { Button, Avatar, AvatarFallback } from "@/components/ui"
import { EntitySwitcher } from "@/components/layout/entity-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SearchTrigger } from "@/components/shared/command-palette"
import { getInitials } from "@/lib/utils"

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const user = session?.user
  const initials = user?.name ? getInitials(user.name) : "??"

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search Trigger */}
      <SearchTrigger onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))} />

      {/* Entity Switcher */}
      <EntitySwitcher />

      {/* Notifications */}
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User menu */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {user?.image && (
            <img src={user.image} alt={user.name ?? ""} className="h-full w-full object-cover" />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block">
          <p className="text-sm font-medium leading-none">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
