interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  return (
    <div className="vz-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-steeves-muted">
          {title}
        </p>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-steeves-blue/12 text-steeves-blue">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-[34px] leading-none font-semibold text-[#495057]">{value}</p>
      {subtitle && <p className="mt-2 text-xs text-steeves-muted">{subtitle}</p>}
    </div>
  );
}
