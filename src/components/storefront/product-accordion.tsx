import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionSection = {
  title: string;
  content: ReactNode;
};

type ProductAccordionProps = {
  sections: AccordionSection[];
};

export function ProductAccordion({ sections }: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState(0);

  if (sections.length === 0) return null;

  return (
    <div className="border-t border-[#E5E7EB]">
      {sections.map((section, i) => (
        <div key={section.title} className="border-b border-[#E5E7EB] last:border-0">
          <button
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            className="w-full py-5 flex justify-between items-center text-left focus:outline-none group"
            aria-expanded={openIndex === i}
          >
            <span className="font-semibold text-[#111827] text-[15px] group-hover:text-black transition-colors">
              {section.title}
            </span>
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-[#FAFAFA] transition-transform duration-300",
                openIndex === i && "rotate-180 bg-gray-100",
              )}
            >
              <ChevronDown className="size-[14px] text-[#6B7280]" strokeWidth={2} />
            </div>
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              openIndex === i ? "max-h-[500px] opacity-100 pb-5" : "max-h-0 opacity-0",
            )}
          >
            <div className="text-[#6B7280] text-[14px] leading-relaxed">{section.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
