"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, LayoutDashboard, LineChart, Briefcase, Bell, Settings, LogIn, UserPlus, CreditCard, ShieldCheck } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Palette">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Command.Input placeholder="Search pages, actions, or type '?' for help…" className="w-full bg-transparent outline-none" />
      </div>
      <Command.List className="max-h-[60vh] overflow-auto">
        <Command.Empty className="p-3 text-sm text-muted-foreground">No results found.</Command.Empty>

        <Command.Group heading="Navigate">
          <Command.Item onSelect={() => go("/dashboard")}> <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard </Command.Item>
          <Command.Item onSelect={() => go("/portfolio")}> <Briefcase className="w-4 h-4 mr-2" /> Portfolio </Command.Item>
          <Command.Item onSelect={() => go("/markets")}> <LineChart className="w-4 h-4 mr-2" /> Markets </Command.Item>
          <Command.Item onSelect={() => go("/orders")}> <CreditCard className="w-4 h-4 mr-2" /> Orders </Command.Item>
          <Command.Item onSelect={() => go("/notifications")}> <Bell className="w-4 h-4 mr-2" /> Notifications </Command.Item>
        </Command.Group>

        <Command.Separator />

        <Command.Group heading="Account">
          <Command.Item onSelect={() => go("/login")}> <LogIn className="w-4 h-4 mr-2" /> Log in </Command.Item>
          <Command.Item onSelect={() => go("/register")}> <UserPlus className="w-4 h-4 mr-2" /> Create account </Command.Item>
          <Command.Item onSelect={() => go("/compliance")}> <ShieldCheck className="w-4 h-4 mr-2" /> Compliance Center </Command.Item>
          <Command.Item onSelect={() => go("/pricing")}> <CreditCard className="w-4 h-4 mr-2" /> Pricing </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
