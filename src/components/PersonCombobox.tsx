import React, { useId, useMemo, useState } from 'react';
import { cleanPersonName, personKey } from '../utils/person';

interface Props {
  value: string;
  options: string[];
  onChange: (name: string) => void;
  maxLength?: number;
}

const MAX_VISIBLE = 50;

/**
 * Searchable person picker. Pick an existing person from the list, or type a
 * new name and choose "Add new person". Free text is always allowed; the
 * transaction save step re-checks for duplicates, so this is a convenience
 * layer, not the only guard.
 */
export function PersonCombobox({ value, options, onChange, maxLength = 150 }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = cleanPersonName(value);
  const typedKey = personKey(value);

  const exactMatch = useMemo(
    () => (typedKey ? options.find((o) => personKey(o) === typedKey) : undefined),
    [options, typedKey]
  );

  const filtered = useMemo(
    () => options.filter((o) => !typedKey || personKey(o).includes(typedKey)).slice(0, MAX_VISIBLE),
    [options, typedKey]
  );

  const canAddNew = typed.length > 0 && !exactMatch;
  // Items are either an existing name or the trailing "add new" entry.
  const items: { name: string; isNew: boolean }[] = [
    ...filtered.map((name) => ({ name, isNew: false })),
    ...(canAddNew ? [{ name: typed, isNew: true }] : []),
  ];

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (items.length === 0 ? -1 : (i + 1) % items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (items.length === 0 ? -1 : i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // Only intercept Enter when the user has highlighted an entry;
      // otherwise let it submit the form as before.
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        choose(items[active].name);
      }
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  let hint: string | null = null;
  if (typed) {
    if (exactMatch) {
      hint = exactMatch === typed ? null : `Matches existing person “${exactMatch}” — that record will be used.`;
    } else {
      hint = 'New person — will be created when you save.';
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>Person Name</label>
      <div className="combobox">
        <input
          id={id}
          required
          maxLength={maxLength}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          value={value}
          placeholder="Search or add a person"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); setActive(-1); }}
          onKeyDown={onKeyDown}
        />
        {open && items.length > 0 && (
          <ul className="combobox-list" id={listId} role="listbox">
            {items.map((item, i) => (
              <li
                key={`${item.isNew ? 'new:' : ''}${item.name}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`combobox-option${i === active ? ' active' : ''}${item.isNew ? ' new' : ''}`}
                // mousedown (not click) so the input doesn't blur and close the list first
                onMouseDown={(e) => { e.preventDefault(); choose(item.name); }}
                onMouseEnter={() => setActive(i)}
              >
                {item.isNew ? `+ Add new person “${item.name}”` : item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <span className="combobox-hint">{hint}</span>}
    </div>
  );
}
