import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useLocation } from 'react-router-dom';
import { analyticsHostEnabled, telemetryRouteTemplate } from '../../utils/observability';

export function WebAnalytics() {
  const { pathname } = useLocation();
  if (!import.meta.env.PROD || !analyticsHostEnabled(window.location.hostname)) return null;

  const route = telemetryRouteTemplate(pathname);

  return (
    <>
      <Analytics route={route} />
      <SpeedInsights route={route} />
    </>
  );
}
