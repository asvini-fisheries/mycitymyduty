import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const textareaId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-civic-800">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={3}
        className={cn(
          "w-full rounded-lg border border-civic-200 px-3 py-2 text-sm text-civic-900",
          "focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200",
          className
        )}
        {...props}
      />
    </div>
  );
}

