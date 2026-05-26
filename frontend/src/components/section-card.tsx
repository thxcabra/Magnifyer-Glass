import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand layout primitives shared by every page.
 *
 * `PageShell` is the center-column container (constrained width, consistent
 * padding, vertical rhythm). `PageHeader` is the kicker + big Rubik title +
 * muted subtitle. `SectionCard` is the generously rounded brand surface that
 * holds a page's content blocks. No hooks, so these work in both server and
 * client components.
 */

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-5xl space-y-6 p-4 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Optional controls rendered on the right (selectors, links). */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <p className="text-muted-foreground text-xs tracking-wide uppercase">{kicker}</p>
        )}
        <h1 className="font-heading mt-1 text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}

export function SectionCard({
  title,
  action,
  headerRight,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  action?: { href: string; label: string };
  /** Arbitrary controls on the right of the section header. */
  headerRight?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const hasHeader = Boolean(title || action || headerRight);
  return (
    <section
      className={cn(
        "bg-card rounded-3xl p-5 ring-1 ring-foreground/10 sm:p-6",
        className,
      )}
    >
      {hasHeader && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2 className="font-heading text-xl font-bold tracking-tight">{title}</h2>
          ) : (
            <span />
          )}
          {action ? (
            <Link
              href={action.href}
              className="text-primary hover:bg-accent shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors"
            >
              {action.label} →
            </Link>
          ) : (
            headerRight
          )}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
