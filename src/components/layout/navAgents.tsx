"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import {
  buildNavigationWithProjects,
  STATIC_NAVIGATION,
  type NavType,
} from "@/config/navigation";
import { atom, useAtom } from "@/lib/atom";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const navAtom = atom(false);

export function NavAgents() {
  const [isAllOpen] = useAtom(navAtom);
  const [navigationItems, setNavigationItems] =
    useState<NavType[]>(STATIC_NAVIGATION);
  const [loading, setLoading] = useState(true);

  // Load dynamic navigation on mount
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const dynamicNav = await buildNavigationWithProjects();
        setNavigationItems(dynamicNav);
      } catch (error) {
        console.error("Failed to load navigation:", error);
        // Keep static navigation as fallback
      } finally {
        setLoading(false);
      }
    };

    loadNavigation();
  }, []);

  // Refresh navigation when projects might have changed
  const refreshNavigation = async () => {
    try {
      const dynamicNav = await buildNavigationWithProjects();
      setNavigationItems(dynamicNav);
    } catch (error) {
      console.error("Failed to refresh navigation:", error);
    }
  };

  // Expose refresh function globally for other components to trigger
  useEffect(() => {
    (window as { refreshNavigation?: () => void }).refreshNavigation = refreshNavigation;
    return () => {
      delete (window as { refreshNavigation?: () => void }).refreshNavigation;
    };
  }, []);

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          <div className="p-4 text-sm text-muted-foreground">
            Loading projects...
          </div>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          {navigationItems.map((item) => (
            <NavItem key={item.name} item={item} isAllOpen={isAllOpen} />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

function NavItem({
  item,
  child,
  isAllOpen,
}: {
  item: (typeof STATIC_NAVIGATION)[0];
  child?: boolean;
  isAllOpen?: boolean;
}) {
  const pathname = usePathname();
  const [mount, setMount] = useState(false);
  let isCurrent = false;
  switch (true) {
    case item.href === "/dashboard":
      isCurrent = pathname === item.href;
      break;
    case !!item.href:
      isCurrent = pathname.includes(item.href);
      break;
    default:
      isCurrent = false;
  }

  const [open, setOpen] = useState(isCurrent);

  useEffect(() => {
    if (!mount) {
      setOpen(isCurrent);
      setMount(true);
      return;
    }
    setOpen(isAllOpen ?? isCurrent);
  }, [isAllOpen, isCurrent, mount]);

  if (item.children) {
    return (
      <Collapsible
        key={item.name}
        asChild
        open={open}
        onOpenChange={setOpen}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.name}>
              {!child && item.icon && <item.icon />}
              {child && (
                <ChevronRightIcon
                  className={cn(
                    "transition-transform duration-200",
                    open ? "rotate-90" : "rotate-0"
                  )}
                />
              )}
              <span>{item.name}</span>
              {!child && (
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((subItem) => (
                <NavItem
                  key={subItem.name}
                  item={subItem}
                  child
                  isAllOpen={isAllOpen}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }
  return (
    <SidebarMenuItem>
      <Link href={item.href ?? "#"}>
        <SidebarMenuButton
          tooltip={item.name}
          tabIndex={-1}
          className={cn(child ? "pl-6" : "")}
          isActive={isCurrent && pathname === item.href}
        >
          {item.icon && <item.icon />}
          <span>{item.name}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}
