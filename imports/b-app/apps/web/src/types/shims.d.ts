/* Module shims to satisfy TypeScript when editor tooling can't resolve package types */
declare module 'lucide-react' {
  import * as React from 'react';
  export type Icon = React.FC<React.SVGProps<SVGSVGElement>>;
  export const Home: Icon;
  export const TrendingUp: Icon;
  export const PieChart: Icon;
  export const Bell: Icon;
  export const Search: Icon;
  export const Settings: Icon;
  export const User: Icon;
  export const ChevronDown: Icon;
  export const Menu: Icon;
  export const X: Icon;
  export const Shield: Icon;
  export const BarChart3: Icon;
  export const Calendar: Icon;
  export const Users: Icon;
  export const Globe: Icon;
  export const Brain: Icon;
  export const Target: Icon;
  export const Sun: Icon;
  export const Moon: Icon;
  export const User2: Icon;
  export const ChevronRight: Icon;
  export const Lock: Icon;
  export const AlertTriangle: Icon;
  export const Check: Icon;
}

declare module 'framer-motion' {
  export const motion: any;
  export const AnimatePresence: any;
  export type Variants = any;
  export function useAnimation(): any;
  export function useMotionValue(init?: number): any;
  export function useTransform(...args: any[]): any;
  export interface PanInfo { [key: string]: any }
}

