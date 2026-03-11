import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  FileText, 
  Wallet, 
  CloudLightning, 
  AlertTriangle, 
  Timer, 
  BarChart3, 
  UserCog, 
  UserPlus, 
  Globe, 
  Settings2, 
  Zap, 
  Menu, 
  Settings 
} from "lucide-react";

export const sidebarGroups = [
  {
    label: null,
    items: [
      { label: 'Dashboard', route: '/admin/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    label: 'Manage',
    items: [
      { label: 'Workers', route: '/admin/workers', icon: Users },
      { label: 'Policies', route: '/admin/policies', icon: ShieldCheck },
      { label: 'Claims', route: '/admin/claims', icon: FileText },
      { label: 'Payouts', route: '/admin/payouts', icon: Wallet },
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Disruption Events', route: '/admin/events', icon: CloudLightning },
      { label: 'Fraud Queue', route: '/admin/fraud', icon: AlertTriangle },
      { label: 'Cron Config', route: '/admin/cron', icon: Timer },
    ]
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', route: '/admin/analytics', icon: BarChart3 },
    ]
  },
];

export const platformGroup = {
  label: 'Platform',
  items: [
    { label: 'Staff Management', route: '/admin/staff', icon: UserCog },
    { label: 'Add Staff', route: '/admin/staff/new', icon: UserPlus },
    { label: 'Platform Stats', route: '/admin/platform', icon: Globe },
    { label: 'Global Settings', route: '/admin/platform/settings', icon: Settings2 },
  ]
};

export const bottomTabs = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    defaultRoute: '/admin/dashboard',
    routes: [
      '/admin/dashboard', 
      '/admin/analytics'
    ],
  },
  {
    label: 'Manage',
    icon: Users,
    defaultRoute: '/admin/workers',
    routes: [
      '/admin/workers',
      '/admin/policies',
      '/admin/claims',
      '/admin/payouts',
    ],
  },
  {
    label: 'Ops',
    icon: Zap,
    defaultRoute: '/admin/events',
    routes: [
      '/admin/events',
      '/admin/fraud',
      '/admin/cron',
    ],
  },
  {
    label: 'More',
    icon: Menu,
    defaultRoute: null,
    routes: [],
  },
];

export const moreDrawerRoutes = [
  '/admin/settings',
  '/admin/staff',
  '/admin/staff/new',
  '/admin/platform',
  '/admin/platform/settings',
];

export const footerItems = [
  { label: 'Settings', route: '/admin/settings', icon: Settings },
];
