import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  ArrowRightLeft,
  Building,
  ChevronDown,
  ChevronRight,
  Building2,
  Wrench,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuth } from '@shared/auth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReportModule {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  basePath: string;
  items: { name: string; href: string }[];
}

interface MenuVisibility {
  hiddenCategories: string[];
  hiddenItems: string[];
}

const MENU_VISIBILITY_KEY = 'menu-visibility';

const navigation: NavItem[] = [
  {
    name: 'Main Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Report Catalog',
    href: '/reports',
    icon: FolderOpen,
  },
];

const reportModules: ReportModule[] = [
  {
    name: '2025 Performance',
    icon: BarChart3,
    basePath: '/sales-2025',
    items: [
      { name: 'Sales Performance', href: '/sales-2025/performance' },
      { name: 'Marketing Performance', href: '/sales-2025/marketing' },
      { name: 'BUD-Head / MGR Performance', href: '/sales-2025/employees' },
    ],
  },
  {
    name: 'Sales Reports',
    icon: TrendingUp,
    basePath: '/sales',
    items: [
      { name: 'Overview', href: '/sales' },
      { name: 'Sales Pipeline', href: '/sales/pipeline' },
      { name: 'Channel Performance', href: '/sales/channel' },
      { name: 'Lead Quality', href: '/sales/leads' },
    ],
  },
  {
    name: 'Transfer Reports',
    icon: ArrowRightLeft,
    basePath: '/transfer',
    items: [
      { name: 'Overview', href: '/transfer' },
      { name: 'Transfer Aging', href: '/transfer/aging' },
      { name: 'Transfer Status', href: '/transfer/status' },
    ],
  },
  {
    name: 'Common Fee Reports',
    icon: Building,
    basePath: '/reports/common-fee',
    items: [
      { name: 'Overview', href: '/reports/common-fee' },
      { name: 'Project Overview', href: '/reports/common-fee/overview' },
      { name: 'Aging Report', href: '/reports/common-fee/aging' },
      { name: 'ตั้งค่า', href: '/reports/common-fee/settings' },
    ],
  },
  {
    name: 'Quality Reports',
    icon: Wrench,
    basePath: '/quality',
    items: [
      { name: 'Overview', href: '/quality' },
      { name: 'Project Overview', href: '/quality/project-overview' },
      { name: 'Category by Project', href: '/quality/category-by-project' },
      { name: 'Aging Report', href: '/quality/aging' },
      { name: 'All Requests', href: '/quality/requests' },
      { name: 'Complaints', href: '/quality/complain' },
      { name: 'Settings', href: '/quality/settings' },
    ],
  },
  {
    name: 'Data Tools',
    icon: Settings,
    basePath: '/data-tools',
    items: [
      { name: 'Excel Import', href: '/data-tools/excel-import' },
      { name: 'Menu Settings', href: '/data-tools/menu-settings' },
    ],
  },
];

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedModules, setExpandedModules] = useState<string[]>([
    'Common Fee Reports',
  ]);
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibility>({
    hiddenCategories: [],
    hiddenItems: [],
  });

  // Load menu visibility settings
  useEffect(() => {
    const loadVisibility = () => {
      try {
        const stored = localStorage.getItem(MENU_VISIBILITY_KEY);
        if (stored) {
          setMenuVisibility(JSON.parse(stored));
        }
      } catch {
        // Ignore parse errors
      }
    };

    loadVisibility();

    // Listen for visibility changes
    const handleVisibilityChange = () => loadVisibility();
    window.addEventListener('menu-visibility-changed', handleVisibilityChange);
    return () => window.removeEventListener('menu-visibility-changed', handleVisibilityChange);
  }, []);

  // Filter modules based on visibility
  const visibleModules = useMemo(() => {
    return reportModules
      .filter((module) => !menuVisibility.hiddenCategories.includes(module.name))
      .map((module) => ({
        ...module,
        items: module.items.filter(
          (item) => !menuVisibility.hiddenItems.includes(item.href)
        ),
      }))
      .filter((module) => module.items.length > 0);
  }, [menuVisibility]);

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleName)
        ? prev.filter((name) => name !== moduleName)
        : [...prev, moduleName]
    );
  };

  const isModuleActive = (basePath: string) => {
    return location.pathname.startsWith(basePath);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">SENA</h1>
          <p className="text-xs text-slate-400">Dashboard Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main Navigation */}
        <div className="px-3 mb-6">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Main
          </p>
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Report Modules */}
        <div className="px-3">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Report Modules
          </p>
          <ul className="space-y-1">
            {visibleModules.map((module) => (
              <li key={module.name}>
                <button
                  onClick={() => toggleModule(module.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isModuleActive(module.basePath)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <module.icon className="w-5 h-5" />
                    {module.name}
                  </div>
                  {expandedModules.includes(module.name) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedModules.includes(module.name) && (
                  <ul className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
                    {module.items.map((item) => (
                      <li key={item.name}>
                        <NavLink
                          to={item.href}
                          end
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'text-primary-400 bg-slate-800/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`
                          }
                        >
                          {item.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-64">
        <Outlet />
      </main>
    </div>
  );
}
