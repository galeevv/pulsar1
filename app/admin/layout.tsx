import { redirect } from "next/navigation";

import { AdminFeedbackToast } from "@/app/admin/admin-feedback-toast";
import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  return (
    <SidebarProvider defaultOpen>
      <AdminFeedbackToast />

      <AdminAppSidebar currentRole={session.role} currentUsername={session.username} />

      <SidebarInset className="min-h-screen bg-background">
        <main className="relative min-h-screen bg-background text-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_50%_at_50%_0%,hsl(var(--foreground)/0.06),transparent_70%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_58%,hsl(var(--card)/0.3)_100%)]"
          />

          <div className="mx-auto w-full max-w-[1200px] px-0 pb-0 pt-0 md:px-0 md:pb-0 md:pt-0">
            <div className="mb-2 flex md:hidden">
              <SidebarTrigger className="size-9 rounded-card border border-border/70 bg-card/70" />
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
