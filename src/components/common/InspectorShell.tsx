import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface InspectorAccordionSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function InspectorShell({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <aside className="inspector inspector-shell" aria-label="Right inspector">
      <h2>{title}</h2>
      <div className="inspector-scroll-region">{children}</div>
      {actions ? <div className="inspector-actions">{actions}</div> : null}
    </aside>
  );
}

export function InspectorAccordion({
  activeSectionId,
  onActiveSectionChange,
  sections,
}: {
  activeSectionId: string | null;
  onActiveSectionChange: (id: string | null) => void;
  sections: InspectorAccordionSection[];
}) {
  return (
    <div className="inspector-accordion">
      {sections.map((section) => {
        const isOpen = activeSectionId === section.id;

        return (
          <section className="inspector-accordion-item" key={section.id}>
            <button
              aria-expanded={isOpen}
              className="inspector-accordion-trigger"
              type="button"
              onClick={() => onActiveSectionChange(isOpen ? null : section.id)}
            >
              <span>{section.title}</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 inspector-accordion-chevron${isOpen ? ' open' : ''}`}
              />
            </button>
            {isOpen ? <div className="inspector-accordion-content">{section.content}</div> : null}
          </section>
        );
      })}
    </div>
  );
}

export function InspectorSubCollapsible({
  children,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="inspector-sub-collapsible">
      <button aria-expanded={isOpen} className="inspector-sub-trigger" type="button" onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 inspector-accordion-chevron${isOpen ? ' open' : ''}`}
        />
      </button>
      {isOpen ? <div className="inspector-sub-content">{children}</div> : null}
    </section>
  );
}
