// Shared types for layout components
export interface CollapsibleComponentProps {
  isCollapsed: boolean;
}
export interface ImageSources {
  fallback: string;
  webp?: string | null;
  avif?: string | null;
}
export interface DrawerItemProps {
  icon?: string;
  title: string;
  subtitle?: string;
  to?: string;
  href?: string;
  avatar?: ImageSources;
  isCollapsed: boolean;
}
export interface TraderStanding {
  trader: string;
  level: number;
  maxLevel: number;
  standing: number;
  nextLevelStanding?: number;
  unlocked: boolean;
  loyaltyRequired?: boolean;
  hasRequirement?: boolean;
}
