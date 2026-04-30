import { Link } from "react-router-dom";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  to?: string;
};

const Mark = () => (
  <span className="brand-symbol" aria-hidden="true">
    <span />
  </span>
);

const Text = ({ compact }: { compact?: boolean }) => (
  <span className="flex flex-col leading-none">
    <span className="font-display text-[15px] font-semibold uppercase tracking-[-0.05em] text-foreground">{BRAND_NAME}</span>
    {!compact && <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Delivery OS</span>}
  </span>
);

export const BrandMark = ({ compact, className, to }: BrandMarkProps) => {
  const content = (
    <>
      <Mark />
      <Text compact={compact} />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn("inline-flex items-center gap-2.5", className)} aria-label={PRODUCT_NAME}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} aria-label={PRODUCT_NAME}>
      {content}
    </div>
  );
};

