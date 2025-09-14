# Portal

## InvestPro Frontend System Design

### Component map (reusable UI)
- Buttons: primary, secondary, ghost, destructive; loading, disabled, icon-only
- Navigation: `ResponsiveSidebar`, top header, tabs, breadcrumbs
- Cards: base `Card`, `KpiCard`, AI card, elevated card
- Data viz: `InteractiveLineChart`, area/line, pie, heatmap (via recharts/visx)
- Tables: positions table, trades table (TanStack Table)
- Forms: input, label, select, checkbox, radio, slider, switch, date picker
- Feedback: toast, tooltip, alert, skeleton, spinner
- Overlays: modal/dialog, drawer/sheet, popover, hovercard
- Panels: resizable panels, accordions, collapsibles
- Charts: performance, allocation, activity (composed components)

### Pages wired
- Landing (`/` via auth gate), Login/Signup, Onboarding (`/onboarding`)
- Dashboard (`/dashboard`), Portfolio (overview, holdings, allocation, performance)
- Risk Management (`/risk-management`), Markets (`/markets`), Screener, Orders
- AI Insights (`/ai-insights`)

### Responsive strategy
- Desktop: 12-col grid, persistent left sidebar 256px, content max-w-[1600px]
- Tablet: sidebar collapses; major modules stack; charts min-height 240
- Mobile: sticky top bar and slide-over menu; KPI cards in 2-col → 1-col

### Motion and micro-interactions
- Framer Motion for enter/exit, hover-lift, subtle chart transitions
- Focus-visible rings and WCAG AA contrast; prefers-reduced-motion respected

### Theming
- Tailwind v4 theme tokens mapped to CSS vars in `src/app/globals.css`
- Dark is default for dashboards; light for onboarding/compliance

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
