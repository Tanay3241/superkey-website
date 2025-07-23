
import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  gradient,
  className
}) => {
  return (
    <Card className={cn(
      "bg-white dark:bg-gray-800/50 border border-gray-200/20 dark:border-gray-700/50 backdrop-blur-sm p-6",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-r",
          gradient,
          title === "Revoked Keys" ? "bg-opacity-20" : "bg-opacity-10"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            title === "Revoked Keys" 
              ? "text-rose-500 dark:text-rose-400" 
              : "text-gray-800 dark:text-gray-200"
          )} />
        </div>
      </div>
    </Card>
  );
};
