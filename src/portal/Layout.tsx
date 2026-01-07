import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Building2,
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
];

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedModules, setExpandedModules] = useState<string[]>([
    'Sales Reports',
    'Transfer Reports',
  ]);

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
            {reportModules.map((module) => (
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
