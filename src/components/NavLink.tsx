"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  activeClassName?: string;
  className?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, end, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = end
      ? pathname === href
      : pathname.startsWith(href as string);

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
