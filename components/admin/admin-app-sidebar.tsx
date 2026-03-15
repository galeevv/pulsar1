"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Activity,
  BadgeDollarSign,
  ChevronRight,
  CircleUserRound,
  FileText,
  LifeBuoy,
  LogOut,
  Orbit,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { AdminAccountCredentialsForm } from "@/components/admin/admin-account-credentials-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarLink = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const navGroups: Array<{ id: string; links: SidebarLink[]; title: string }> = [
  {
    id: "overview",
    links: [
      { href: "/admin", icon: ShieldCheck, label: "Dashboard" },
      { href: "/admin/users", icon: Users, label: "Users" },
    ],
    title: "Core",
  },
  {
    id: "growth",
    links: [
      { href: "/admin/codes", icon: BadgeDollarSign, label: "Codes" },
      { href: "/admin/tariffs", icon: Settings2, label: "Tariff Rules" },
      { href: "/admin/payments", icon: ReceiptText, label: "Payments" },
    ],
    title: "Growth & Billing",
  },
  {
    id: "operations",
    links: [
      { href: "/admin/support", icon: LifeBuoy, label: "Support" },
      { href: "/admin/rules", icon: FileText, label: "Documents" },
      { href: "/admin/operations", icon: Activity, label: "Operations" },
    ],
    title: "Operations",
  },
];

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function AdminAppSidebar({
  currentRole,
  currentUsername,
}: {
  currentRole: "ADMIN" | "USER";
  currentUsername: string;
}) {
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const pathname = normalizePathname(usePathname() ?? "/admin");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const roleLabel = currentRole === "ADMIN" ? "Admin" : "User";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3 group-data-[collapsible=icon]:px-2">
        <button
          className="group inline-flex w-full cursor-pointer items-center gap-2 rounded-card border border-sidebar-border bg-sidebar-accent/50 px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          onClick={toggleSidebar}
          type="button"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-card bg-transparent">
            <Orbit className="size-5 text-sidebar-foreground" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold tracking-[0.18em] text-sidebar-foreground/90">
              PULSAR
            </span>
          </span>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup className="p-0" key={group.id}>
            <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/50 group-data-[collapsible=icon]:pointer-events-none">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "h-10 rounded-card px-3 text-sm",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        )}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            setOpenMobile(false);
                          }}
                        >
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-0 p-3 group-data-[collapsible=icon]:px-2">
        <Dialog onOpenChange={setAccountDialogOpen} open={accountDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded-card border border-sidebar-border bg-sidebar-accent/50 p-2 text-left transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                type="button"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-card bg-transparent">
                  <CircleUserRound className="size-5" />
                </span>
                <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate text-sm font-medium text-sidebar-foreground">
                    {currentUsername}
                  </span>
                  <span className="block truncate text-xs text-sidebar-foreground/60">{roleLabel}</span>
                </span>
                <ChevronRight className="ml-auto size-4 text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52" side="top">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setAccountDialogOpen(true);
                }}
              >
                <CircleUserRound className="size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button className="flex w-full items-center gap-2 text-left" form="admin-sidebar-logout" type="submit">
                  <LogOut className="size-4" />
                  Log out
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <form action={logoutAction} id="admin-sidebar-logout" />

          <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
              <DialogDescription>
                Update admin credentials. Current password is required for each change.
              </DialogDescription>
            </DialogHeader>
            <AdminAccountCredentialsForm currentUsername={currentUsername} submitLabel="Save changes" />
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
