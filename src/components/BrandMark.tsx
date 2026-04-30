import { Link } from "react-router-dom";
import { PRODUCT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import logoOfficial from "@/assets/vexortech-logo-official.png";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  to?: string;
  animated?: boolean;
};

const Logo = ({ compact }: { compact?: boolean }) => (
  <span className={cn("brand-logo-frame", compact && "brand-logo-frame--compact")} aria-hidden="true">
    <img
      src={logoOfficial}
      alt=""
      className="brand-logo-image"
      decoding="async"
      fetchPriority="high"
    />
  </span>
);

export const BrandMark = ({ compact, className, to, animated = false }: BrandMarkProps) => {
  const classes = cn(
    "brand-mark inline-flex items-center",
    compact && "brand-mark--compact",
    animated && "brand-mark--animated",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={PRODUCT_NAME}>
        <Logo compact={compact} />
      </Link>
    );
  }

  return (
    <div className={classes} aria-label={PRODUCT_NAME}>
      <Logo compact={compact} />
    </div>
  );
};
