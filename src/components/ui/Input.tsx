import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-civic-800">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-civic-200 px-3 py-2 text-sm text-civic-900",
          "focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

