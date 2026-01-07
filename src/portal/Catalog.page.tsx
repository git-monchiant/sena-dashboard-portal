import { useNavigate } from 'react-router-dom';
import { PageHeader, Badge } from '@shared/ui';
import { reportRegistry } from './registry';
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Clock,
  FileCheck,
  Target,
  LucideIcon,
} from 'lucide-react';

const colorClasses: Record<string, { bg: string; bgHover: string; text: string; badge: string }> = {
  emerald: {
    bg: 'bg-emerald-100',
    bgHover: 'group-hover:bg-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  blue: {
    bg: 'bg-blue-100',
    bgHover: 'group-hover:bg-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  purple: {
    bg: 'bg-purple-100',
    bgHover: 'group-hover:bg-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  orange: {
    bg: 'bg-orange-100',
    bgHover: 'group-hover:bg-orange-200',
    text: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
};

interface ReportModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  href: string;
  tags: string[];
  highlights: string[];
  stats: {
    reports: number;
    lastUpdated: string;
  };
  disabled?: boolean;
}

interface ReportCardProps {
  module: ReportModule;
}

function ReportCard({ module }: ReportCardProps) {
  const navigate = useNavigate();
  const colors = colorClasses[module.color] || colorClasses.blue;
  const Icon = module.icon;

  return (
    <div
      className={`card-hover group cursor-pointer ${
        module.disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      onClick={() => !module.disabled && navigate(module.href)}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-14 h-14 ${colors.bg} ${
            !module.disabled && colors.bgHover
          } rounded-xl flex items-center justify-center transition-colors`}
        >
          <Icon className={`w-7 h-7 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-800">{module.name}</h3>
            {module.disabled && <Badge variant="yellow">Coming Soon</Badge>}
          </div>
          <p className="text-sm text-slate-500 line-clamp-2">{module.description}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {module.tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Key Insights
        </p>
        <ul className="space-y-1.5">
          {module.highlights.slice(0, 5).map((highlight, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-slate-600"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            {module.stats.reports} reports
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {module.stats.lastUpdated}
          </span>
        </div>
        {!module.disabled && (
          <button className="flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:text-primary-700">
            Open
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function CatalogPage() {
  const activeModules = reportRegistry.filter((m) => !m.disabled);
  const totalReports = reportRegistry.reduce((acc, m) => acc + m.stats.reports, 0);
  const comingSoon = reportRegistry.filter((m) => m.disabled).length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Report Catalog"
        subtitle="Browse and access all available report modules"
      />

      <div className="p-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {reportRegistry.length}
              </p>
              <p className="text-sm text-slate-500">Report Modules</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {activeModules.length}
              </p>
              <p className="text-sm text-slate-500">Active Modules</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalReports}</p>
              <p className="text-sm text-slate-500">Total Reports</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{comingSoon}</p>
              <p className="text-sm text-slate-500">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Available Modules */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Available Modules
          </h2>
          <p className="text-sm text-slate-500">
            Select a module to access its reports and analytics
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportRegistry.map((module) => (
            <ReportCard key={module.id} module={module} />
          ))}
        </div>
      </div>
    </div>
  );
}
