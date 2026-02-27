"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

import { useLoading } from "@/components/providers/LoadingProvider";

interface NavLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  activeClassName?: string;
  className?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, end, onClick, children, ...props }, ref) => {
    const pathname = usePathname();
    const { setIsLoading, setLoadingText } = useLoading();

    const isActive = end
      ? pathname === href
      : pathname.startsWith(href as string);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Don't trigger if already active
      if (isActive) return;

      // Extract section name for the loader
      let sectionName = "";
      if (typeof children === "string") {
        sectionName = children;
      } else if (href) {
        const segment = (href as string).split("/").filter(Boolean).pop();
        sectionName = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "";
      }

      setLoadingText(sectionName || "Loading");
      setIsLoading(true);
      if (onClick) onClick(e);
    };

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && "active", isActive && activeClassName)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
