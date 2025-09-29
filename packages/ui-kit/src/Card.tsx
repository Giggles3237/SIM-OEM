import { PropsWithChildren } from 'react';
import clsx from 'clsx';

type CardProps = PropsWithChildren<{
  title?: string;
  className?: string;
}>;

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={clsx('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {title && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}
