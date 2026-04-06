import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prediction {
  place_id: string;
  description: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  helperText?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// We use the Places Autocomplete (New) REST API via session tokens
// Fallback: if no key, just render a plain input
export function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address…',
  multiline = false,
  rows = 3,
  className,
  helperText,
}: Props) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef(crypto.randomUUID());

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!GOOGLE_MAPS_API_KEY || input.trim().length < 3) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&key=${GOOGLE_MAPS_API_KEY}&sessiontoken=${sessionTokenRef.current}`
      );
      const data = await res.json();
      if (data.predictions) {
        setPredictions(
          data.predictions.slice(0, 5).map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
          }))
        );
      }
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 3) {
        fetchPredictions(val);
        setIsOpen(true);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    }, 300);
  };

  const handleSelect = (prediction: Prediction) => {
    setQuery(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    // Reset session token after selection (per Google best practices)
    sessionTokenRef.current = crypto.randomUUID();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // If no API key, render plain input
  if (!GOOGLE_MAPS_API_KEY) {
    if (multiline) {
      return (
        <div>
          <Textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={className}
          />
          {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
        </div>
      );
    }
    return (
      <div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
      </div>
    );
  }

  const InputComponent = multiline ? Textarea : Input;
  const inputProps = multiline ? { rows } : {};

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
        <InputComponent
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { if (predictions.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn('pl-8', className)}
          {...inputProps}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>
      {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors',
                i === selectedIndex && 'bg-accent'
              )}
              onClick={() => handleSelect(p)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{p.description}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
