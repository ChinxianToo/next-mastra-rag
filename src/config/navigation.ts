import {
    BookIcon,
    BotIcon,
    FolderIcon,
    HomeIcon,
    type LucideIcon,
  } from "lucide-react";
  
  export type NavType = {
    id?: string;
    name: string;
    current?: boolean;
    icon?: LucideIcon;
    children?: NavType[];
    href: string;
    featureFlag?: string;
  };
  
  // Static navigation items (no projects loaded yet)
  export const STATIC_NAVIGATION: NavType[] = [
    {
      id: "projects",
      name: "Projects",
      href: "/dashboard/projects",
      icon: FolderIcon,
      children: [],
    },
  ];
  
  // Dynamic function to build navigation with projects
  export async function buildNavigationWithProjects(): Promise<NavType[]> {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      const projects = data.projects || [];
  
      // Build project children navigation
      const projectChildren: NavType[] = projects.map((project: { id: string; name: string }) => ({
        id: `project-${project.id}`,
        name: project.name,
        href: `/dashboard/projects/${project.id}`,
        children: [
          {
            id: `project-${project.id}-chatroom`,
            name: "Chatroom",
            href: `/dashboard/projects/${project.id}/chatroom/${process.env.NEXT_PUBLIC_AGENT_ID}`,
            icon: BotIcon,
          },
          {
            id: `project-${project.id}-knowledge`,
            name: "Knowledge Base",
            href: `/dashboard/projects/${project.id}/knowledge_base`,
            icon: BookIcon,
          },
        ],
      }));
  
      return [
        {
          id: "overview",
          name: "Overview",
          href: "/dashboard/projects",
          icon: HomeIcon,
        },
        {
          id: "projects",
          name: "Projects",
          href: "/dashboard/projects",
          icon: FolderIcon,
          children: projectChildren,
        },
      ];
    } catch (error) {
      console.error("Failed to load projects for navigation:", error);
      return STATIC_NAVIGATION;
    }
  }
  
  // Default export for components that need static navigation
  export const NAVIGATION = STATIC_NAVIGATION;
  