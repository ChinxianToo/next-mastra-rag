import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeThinkTags(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "");
}
