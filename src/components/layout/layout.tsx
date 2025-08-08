"use client";

import { AppSidebar } from "@/components/layout/appSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider className="bg-background">
      <AppSidebar />
      <SidebarInset className="h-screen overflow-y-hidden">
        {/* <Card className="mt-2 border-none shadow-none mx-8">
          <CardContent className="p-0">
            <header className="flex flex-row bg-background justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-y-1">
                  <p className="font-semibold">Hospital Seri Manjung</p>
                  <NavBreadcrumb />
                </div>
              </div>
              <div className="mr-2">
                <NavUser />
              </div>
            </header>
          </CardContent>
        </Card> */}
        <div className="flex-1 w-full h-[calc(100vh-58px-16px)]">
          <ScrollArea className="w-full h-full">
            {/* content here */}
            {children}
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
