import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Handshake } from "lucide-react";

export function Logo({
  className,
  href = "/",
  variant = "full",
}: {
  className?: string;
  href?: string;
  /** "full" shows logo image + wordmark; "icon" shows the square mark only. */
  variant?: "full" | "icon";
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label="Jomlink — Home"
    >
      {variant === "icon" ? (
        <Image
          src="/icon.png"
          alt="Jomlink"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg object-contain"
          priority
        />
      ) : (
        <span className="inline-flex items-center gap-2.5">
          <Image
            src="/jomlink-logo.png"
            alt="Jomlink"
            width={120}
            height={38}
            className="h-9 w-auto object-contain"
            priority
          />
          <span className="sr-only">Jomlink</span>
        </span>
      )}
      {/* Fallback mark if images haven't loaded / unsupported */}
      <span className="hidden">
        <Handshake className="h-5 w-5" aria-hidden="true" />
      </span>
    </Link>
  );
}