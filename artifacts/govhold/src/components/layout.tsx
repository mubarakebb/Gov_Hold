import { Link, useLocation } from "wouter";
import { Shield, Map as MapIcon, PlusCircle, Home, BarChart2, Settings, LogIn, LogOut, User, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetProfile } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useGetProfile({ query: { enabled: isAuthenticated, retry: false } });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const profileIncomplete = isAuthenticated && profile && !profile.profileComplete;

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/map", label: "Map View", icon: MapIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    ...(user?.isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {profileIncomplete && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Complete your profile to submit reports.</span>
          </div>
          <Link href="/profile/setup" className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Complete Profile →
          </Link>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Gov<span className="text-primary">Hold</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/submit"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-medium transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              Report Issue
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {authLoading ? null : isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-1.5 hover:bg-muted transition-colors"
                >
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{user?.firstName ?? user?.email ?? "Account"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-white border border-border shadow-xl py-1 z-50">
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted" onClick={() => setMenuOpen(false)}>
                      <User className="w-3.5 h-3.5" /> My Profile
                    </Link>
                    {profileIncomplete && (
                      <Link href="/profile/setup" className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50" onClick={() => setMenuOpen(false)}>
                        <AlertTriangle className="w-3.5 h-3.5" /> Complete Profile
                      </Link>
                    )}
                    <div className="border-t border-border my-1" />
                    <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/5">
                      <LogOut className="w-3.5 h-3.5" /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <LogIn className="w-4 h-4" /> Log in
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={logout} className="text-muted-foreground">
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={login} className="text-muted-foreground">
                <LogIn className="w-5 h-5" />
              </button>
            )}
            <Link href="/submit" className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
              <PlusCircle className="w-4 h-4" /> Report
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      <footer className="bg-white border-t border-border py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            GovHold Civic Accountability Platform &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe z-40">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/map", label: "Map", icon: MapIcon },
            { href: "/analytics", label: "Stats", icon: BarChart2 },
            ...(user?.isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
