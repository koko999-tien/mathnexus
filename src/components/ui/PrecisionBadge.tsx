import { ShieldCheck } from 'lucide-react';
import { getPrecisionPolicy, type MathPrecisionMode } from '../../utils/precisionPolicy';

export function PrecisionBadge({
  mode,
  suffix,
  compact = false,
}: {
  mode: MathPrecisionMode;
  suffix?: string;
  compact?: boolean;
}) {
  const policy = getPrecisionPolicy(mode);
  return <span
    className={'precision-badge ' + mode + (compact ? ' compact' : '')}
    title={policy.description}
  >
    <ShieldCheck size={compact ? 11 : 13} />
    <span>{policy.label} · {policy.arithmetic}{suffix ? ' · ' + suffix : ''}</span>
  </span>;
}
