import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionSection = {
  title: string;
  content: string;
};

type ProductAccordionProps = {
  sections: AccordionSection[];
};

export function ProductAccordion({ sections }: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState(0);

  if (sections.length === 0) return null;

  return (
    <div className="mt-9 space-y-0 divide-y divide-border/40">
      {sections.map((section, i) => (
        <div key={section.title} className="group">
          <button
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            className="flex items-center justify-between cursor-pointer select-none w-full"
            style={{ height: "60px" }}
            aria-expanded={openIndex === i}
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
              {section.title}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-250",
                openIndex === i && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </button>
          {openIndex === i && (
            <div className="pb-6 text-sm text-muted-foreground leading-relaxed">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
