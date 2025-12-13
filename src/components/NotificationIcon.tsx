import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface NotificationIconProps {
  iconName: string;
  size?: number;
  className?: string;
}

const getLucideIcon = (name: string): React.ComponentType<LucideProps> | null => {
  // @ts-ignore
  const Icon = LucideIcons[name];
  return Icon || null;
};

export const NotificationIcon: React.FC<NotificationIconProps> = ({ iconName, size = 20, className = '' }) => {
  const IconComponent = getLucideIcon(iconName);

  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in Lucide React.`);
    return <LucideIcons.Bell size={size} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
};