import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-civic-800">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-civic-200 px-3 py-2 text-sm text-civic-900 bg-white",
          "focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200",
          className
        )}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

