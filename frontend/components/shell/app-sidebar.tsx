'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LinkPending } from '@/components/link-pending';
import { isActivePath, navGroupsForRole } from '@/lib/nav';
import type { SessionUser } from '@/lib/auth/cookie-names';

// One sidebar, three shapes: full (≥1024), icon rail (<1024, tooltips carry the labels), sheet on
// phones — all handled by shadcn's Sidebar. Groups are the console's map (lib/nav.ts).
export function AppSidebar({ user, pendingCount = 0 }: { user: SessionUser; pendingCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const groups = navGroupsForRole(user.role);
  const initials = user.email.slice(0, 2).toUpperCase();
  const roleLabel = user.role.replace('_', ' ');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="MaxOne Console">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg viewBox="0 0 512 512" className="size-5" aria-hidden>
                  <path d="M136 372V150l120 132 120-132v222" fill="none" stroke="currentColor" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="grid leading-tight">
                <span className="font-semibold">MaxOne</span>
                <span className="text-xs text-muted-foreground">Console</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActivePath(item.href, pathname);
                  const count = item.badge === 'pending' ? pendingCount : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link href={item.href} aria-current={active ? 'page' : undefined} />}
                      >
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                        <LinkPending className="ml-auto text-muted-foreground" />
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge className="bg-status-pending/12 text-status-pending tabular" aria-label={`${count} pending`}>
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" tooltip={user.email} className="data-[state=open]:bg-sidebar-accent" />}
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-secondary text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">{user.email}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">{roleLabel}</span>
                </span>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{user.email}</span>
                  <span className="block text-xs text-muted-foreground capitalize">{roleLabel}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {theme === 'dark' ? <Moon aria-hidden /> : theme === 'light' ? <Sun aria-hidden /> : <Monitor aria-hidden />}
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={(v) => setTheme(String(v))}>
                      <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut aria-hidden />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
