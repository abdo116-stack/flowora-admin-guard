import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { PortfolioEditor } from "@/components/PortfolioEditor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/business/$id")({
  head: () => ({
    meta: [
      { title: "Edit portfolio — Tapro admin" },
      { name: "description", content: "Edit a Tapro business portfolio." },
      { property: "og:title", content: "Edit portfolio — Tapro admin" },
      { property: "og:description", content: "Edit a Tapro business portfolio." },
    ],
  }),
  component: AdminBusiness,
});

function AdminBusiness() {
  const { id } = Route.useParams();
  const { data: auth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!auth?.isAdmin) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-sm text-muted-foreground">Administrators only.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit portfolio">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit portfolio</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin">Back to console</Link>
        </Button>
      </div>
      <PortfolioEditor businessId={id} canPublish />
    </AppShell>
  );
}
