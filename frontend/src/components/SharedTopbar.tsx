import { Link } from "react-router-dom";
import { Shield, Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Navigate } from "react-router-dom";

export interface SharedTopbarProps {
  // Brand
  brandLink: string;
  brandTitle?: string;
  showSuperAdminBadge?: boolean;
  
  // Search
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  
  // Notifications
  unreadCount: number;
  onNotificationsOpen: () => void;
  
  // User Profile
  initials: string;
  userName?: string;
  userJobTitle?: string;
  profileLink: string;
  onLogout: () => void;
}

export function SharedTopbar({

  brandLink,
  brandTitle = "GigShield",
  showSuperAdminBadge,
  showSearch,
  searchValue,
  onSearchChange,
  unreadCount,
  onNotificationsOpen,
  initials,
  userName,
  userJobTitle,
  profileLink,
  onLogout,
  
}: SharedTopbarProps) {
  return (
    <div className="sticky top-4 z-50 px-4 sm:px-6 shrink-0 mb-4 h-14 pointer-events-none transition-all duration-300">
      <header className="flex h-full w-full items-center gap-4 border border-border/40 rounded-full bg-background/70 backdrop-blur-xl px-4 shadow-sm pointer-events-auto">
        {/* Brand - Mobile Only (Visible when md:hidden) */}
        <Link to={brandLink} className="flex md:hidden items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold font-display">{brandTitle}</span>
          {showSuperAdminBadge && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium ml-1 whitespace-nowrap">
              Super
            </span>
          )}
        </Link>

        {/* Search Bar - Center */}
        <div className="flex-1 flex justify-start items-center">
          {showSearch && (
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full pl-9 pr-12 h-9 bg-muted/30 border-0 rounded-full focus-visible:ring-1"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>F
              </kbd>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-full hover:bg-muted/50" onClick={onNotificationsOpen}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center animate-in zoom-in border-background border-2">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            <span className="sr-only">Notifications</span>
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-1 rounded-full hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
              {userName && (
                <div className="flex flex-col space-y-1 p-2 border-b mb-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  {userJobTitle && (
                    <p className="text-xs leading-none text-muted-foreground">{userJobTitle}</p>
                  )}
                </div>
              )}
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link to={profileLink}>Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive rounded-lg focus:bg-destructive focus:text-destructive-foreground mt-1">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
