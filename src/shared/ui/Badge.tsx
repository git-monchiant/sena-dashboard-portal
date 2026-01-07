import { ReactNode } from 'react';

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'red' | 'slate';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
  red: 'bg-red-100 text-red-800',
  slate: 'bg-slate-100 text-slate-800',
};

export function Badge({ children, variant = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
