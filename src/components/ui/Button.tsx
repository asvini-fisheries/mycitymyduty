import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variant === "primary" &&
          "bg-civic-700 text-white hover:bg-civic-800",
        variant === "secondary" &&
          "border border-civic-200 bg-white text-civic-800 hover:bg-civic-50",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" &&
          "text-civic-700 hover:bg-civic-50",
        className
      )}
      {...props}
    />
  );
}

