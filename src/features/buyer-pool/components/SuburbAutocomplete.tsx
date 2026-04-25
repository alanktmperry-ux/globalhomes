import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchSuburbs } from "../api";
import type { SuburbSuggestion } from "../types";

type Props = {
  onSelect: (s: SuburbSuggestion) => void;
};

export function SuburbAutocomplete({ onSelect }: Props) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["suburb-search", value.trim().toLowerCase()],
    queryFn: () => searchSuburbs(value),
    enabled: value.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handlePick(s: SuburbSuggestion) {
    setValue(`${s.suburb_name} (${s.state})`);
    setOpen(false);
    onSelect(s);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter" && suggestions[0]) {
        e.preventDefault();
        handlePick(suggestions[0]);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlight];
      if (pick) handlePick(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSubmit() {
    if (suggestions[0]) handlePick(suggestions[0]);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder="Enter your suburb (e.g. Berwick, Cabramatta)"
            className="pl-10 h-12 text-base"
            autoComplete="off"
            inputMode="search"
            aria-label="Suburb search"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          size="lg"
          onClick={handleSubmit}
          className="h-12 whitespace-nowrap"
          disabled={suggestions.length === 0}
        >
          Show me the buyer pool
        </Button>
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-fade-in"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.suburb_slug}-${s.state}`}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => handlePick(s)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                i === highlight ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <span className="font-medium text-foreground">
                {s.suburb_name}
              </span>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {s.state}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
