import type { ReactNode } from "react";

type NoticeTone = "default" | "warning" | "error" | "success";
type NoticeVariant = "card" | "banner";

type NoticeProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  role?: "alert" | "status";
  title?: string;
  tone?: NoticeTone;
  variant?: NoticeVariant;
};

const CARD_TONE_CLASS: Record<NoticeTone, string> = {
  default: "border-gray-800 bg-gray-950 text-gray-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const BANNER_TONE_CLASS: Record<NoticeTone, string> = {
  default: "border-gray-800 bg-gray-900 text-gray-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Notice({
  children,
  className,
  contentClassName,
  role,
  title,
  tone = "default",
  variant = "card",
}: NoticeProps) {
  if (variant === "banner") {
    return (
      <div
        role={role ?? "alert"}
        className={joinClasses("border-b", BANNER_TONE_CLASS[tone], className)}
      >
        <div
          className={joinClasses(
            "mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6 lg:px-8",
            contentClassName,
          )}
        >
          {title && <p className="font-medium">{title}</p>}
          {title ? <p className="mt-1">{children}</p> : children}
        </div>
      </div>
    );
  }

  return (
    <div
      role={role}
      className={joinClasses(
        "rounded-xl border p-4 text-sm",
        CARD_TONE_CLASS[tone],
        className,
      )}
    >
      {title && <p className="font-medium">{title}</p>}
      {title ? <p className="mt-2">{children}</p> : children}
    </div>
  );
}
