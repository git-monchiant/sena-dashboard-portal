import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ColorVariant = 'emerald' | 'blue' | 'purple' | 'orange' | 'amber' | 'red' | 'slate';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'warning' | 'neutral';
  showArrow?: boolean;
  target?: {
    percentage: number;
  };
  subtext?: string;
  icon: LucideIcon;
  color: ColorVariant;
  href?: string;
  onClick?: () => void;
}

const colorClasses: Record<ColorVariant, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

const badgeColorClasses: Record<ColorVariant, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-500',
};

const valueColorClasses: Record<ColorVariant, string> = {
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  slate: 'text-slate-800',
};

export function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  showArrow = true,
  target,
  subtext,
  icon: Icon,
  color,
  href,
  onClick,
}: KPICardProps) {
  const navigate = useNavigate();
  const isPositive = changeType === 'positive';
  const isClickable = href || onClick;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <div
      className={`card text-left ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary-200 transition-all' : ''}`}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Row 1: Icon + % badge */}
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {change && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badgeColorClasses[color]}`}>
            {showArrow && changeType !== 'neutral' && (
              isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )
            )}
            {change}
          </span>
        )}
      </div>

      {/* Row 2: Value */}
      <p className={`text-xl font-bold text-left ${valueColorClasses[color]}`}>{value}</p>

      {/* Row 3: Subtext (unit count) */}
      {subtext && <p className={`text-xs mb-1 text-left ${color === 'slate' ? 'text-slate-400' : `text-${color}-500`}`}>{subtext}</p>}

      {/* Row 4: Title */}
      <p className="text-xs text-slate-500 font-medium text-left">{title}</p>

      {/* Optional: Progress bar */}
      {target && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${Math.min(100, target.percentage)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{target.percentage.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}
