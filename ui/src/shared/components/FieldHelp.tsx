import { HelpCircle } from "lucide-react";

type FieldHelpProps = {
  text: string;
};

export function FieldHelp({ text }: FieldHelpProps) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      aria-label={text}
      title={text}
    >
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
