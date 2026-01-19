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
      className={`card ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary-200 transition-all' : ''}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              changeType === 'neutral' ? 'text-slate-500' :
              changeType === 'warning' ? 'text-amber-600' :
              isPositive ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {showArrow && changeType !== 'neutral' && (
              isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )
            )}
            {change}
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
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
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}
