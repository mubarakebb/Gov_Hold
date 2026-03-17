import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoordinate(coord: number | null | undefined): string {
  if (coord === null || coord === undefined) return "Unknown";
  return coord.toFixed(4);
}
