import { Link } from "@tanstack/react-router";
import { Brand } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "QR Design Studio", to: "/qr-studio" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {NAV.map((item) =>
            "to" in item ? (
              <Button key={item.label} asChild variant="ghost" size="sm">
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ) : (
              <Button key={item.label} asChild variant="ghost" size="sm">
                <a href={item.href}>{item.label}</a>
              </Button>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Create Your Digital Portfolio</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Brand withTagline />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Tapro replaces paper business cards with a professional digital portfolio, reachable
            through one QR scan.
          </p>
        </div>
        <nav className="space-y-2 text-sm" aria-label="Footer navigation">
          <p className="font-semibold">Explore</p>
          <p>
            <Link to="/qr-studio" className="text-muted-foreground hover:text-foreground">
              QR Design Studio
            </Link>
          </p>
          <p>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </p>
          <p>
            <Link to="/faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
          </p>
          <p>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
          </p>
        </nav>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Contact & legal</p>
          <p className="text-muted-foreground">softatlas38@gmail.com · 0681569749</p>
          <p>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
          <p>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
      <p className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tapro · Your Business, One Scan Away.
      </p>
    </footer>
  );
}
