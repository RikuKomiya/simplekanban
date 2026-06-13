import { Command } from 'cmdk';
import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './Popover';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  /** Visual leading element (icon, color dot, avatar). */
  icon?: ReactNode;
  /** Extra text for search matching beyond the label. */
  keywords?: string;
  /** Trailing hint (e.g. count). */
  hint?: string;
}

interface SelectMenuProps {
  options: SelectOption[];
  value?: string | string[] | null;
  onSelect: (value: string) => void;
  trigger: ReactNode;
  /** When true, lets users select multiple (checkmarks toggle, stays open). */
  multiple?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  header?: ReactNode;
  width?: number;
}

export function SelectMenu({
  options,
  value,
  onSelect,
  trigger,
  multiple = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  align = 'start',
  side = 'bottom',
  open,
  onOpenChange,
  header,
  width = 240,
}: SelectMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const selectedSet = new Set(
    Array.isArray(value) ? value : value ? [value] : [],
  );

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} side={side} className="p-0">
        <Command
          className="flex flex-col"
          style={{ width }}
          filter={(val, search, keywords) => {
            const haystack = (val + ' ' + (keywords?.join(' ') ?? '')).toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          {header}
          <div className="border-b border-[var(--border)] px-2">
            <Command.Input
              autoFocus
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <Command.List className="max-h-[280px] overflow-y-auto p-1">
            <Command.Empty className="px-2 py-3 text-center text-xs text-[var(--text-tertiary)]">
              {emptyText}
            </Command.Empty>
            {options.map((opt) => {
              const selected = selectedSet.has(opt.value);
              return (
                <Command.Item
                  key={opt.value}
                  value={opt.label + ' ' + opt.value}
                  keywords={opt.keywords ? [opt.keywords] : undefined}
                  onSelect={() => {
                    onSelect(opt.value);
                    if (!multiple) setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm cursor-pointer',
                    'data-[selected=true]:bg-[var(--hover)]',
                  )}
                >
                  {opt.icon ? (
                    <span className="flex h-4 w-4 items-center justify-center shrink-0">
                      {opt.icon}
                    </span>
                  ) : null}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.hint ? (
                    <span className="text-2xs text-[var(--text-tertiary)]">
                      {opt.hint}
                    </span>
                  ) : null}
                  {selected ? (
                    <Check size={14} className="text-[var(--accent)]" />
                  ) : null}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
