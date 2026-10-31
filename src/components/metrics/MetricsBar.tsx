import { Grid, type GridProps } from '@umami/react-zen';
import type { ReactNode } from 'react';

export interface MetricsBarProps extends GridProps {
  children?: ReactNode;
}

export function MetricsBar({ children, ...props }: MetricsBarProps) {
  return (
    <Grid
      columns="repeat(auto-fit, minmax(160px, 1fr))"
      gap
      {...props}
      className={['reui-metrics reui-dither', props.className].filter(Boolean).join(' ')}
    >
      {children}
    </Grid>
  );
}
