import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'line' | 'block' | 'circle';
  style?: CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 14,
  variant = 'line',
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden
      className="sp-skeleton"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: variant === 'circle' ? '50%' : 0,
        ...style,
      }}
    />
  );
}
