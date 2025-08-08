"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAtom } from "@/lib/atom";
import { BotIcon, CopyMinusIcon, CopyPlusIcon } from "lucide-react";
import { navAtom, NavAgents } from "./navAgents";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isAllOpen, setIsAllOpen] = useAtom(navAtom);
  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-row justify-between px-2 items-center gap-2 text-base mt-2 group-data-[collapsible=icon]:p-0.5">
              <div className="flex items-center gap-2 font-bold">
                <span className="rounded-full bg-[#81021F] p-2 group-data-[collapsible=icon]:p-1 transition-all">
                  <BotIcon className="w-5 h-5 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all text-white" />
                </span>
                <span className="transition-all group-data-[collapsible=icon]:hidden">EIOS-IKnow</span>
              </div>
              <div className="flex flex-row items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 group-data-[collapsible=icon]:hidden"
                  onClick={() => setIsAllOpen(!isAllOpen)}
                >
                  {isAllOpen ? <CopyMinusIcon /> : <CopyPlusIcon />}
                </Button>
                <SidebarTrigger />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavAgents />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
