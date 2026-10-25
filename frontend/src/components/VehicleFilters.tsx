import { useState, type FormEvent } from 'react';
import type { VehicleFilters as Filters, VehicleSort } from '../types';

interface VehicleFiltersProps {
  onSearch: (filters: Filters) => void;
  sort: VehicleSort;
  onSortChange: (sort: VehicleSort) => void;
  loading: boolean;
}

export function VehicleFilters({ onSearch, sort, onSortChange, loading }: VehicleFiltersProps) {
  const [filters, setFilters] = useState<Filters>({});

  function update(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nonEmpty = Object.fromEntries(Object.entries(filters).filter(([, value]) => value?.trim()));
    onSearch(nonEmpty);
  }

  function clear() {
    setFilters({});
    onSearch({});
  }

  return (
    <form className="filters" onSubmit={submit} aria-label="Vehicle search filters">
      <label>Make<input value={filters.make ?? ''} onChange={(event) => update('make', event.target.value)} placeholder="e.g. Toyota" /></label>
      <label>Model<input value={filters.model ?? ''} onChange={(event) => update('model', event.target.value)} placeholder="e.g. Camry" /></label>
      <label>Category<input value={filters.category ?? ''} onChange={(event) => update('category', event.target.value)} placeholder="e.g. SUV" /></label>
      <label>Minimum price<input type="number" min="0" step="0.01" value={filters.minPrice ?? ''} onChange={(event) => update('minPrice', event.target.value)} /></label>
      <label>Maximum price<input type="number" min="0" step="0.01" value={filters.maxPrice ?? ''} onChange={(event) => update('maxPrice', event.target.value)} /></label>
      <label>Sort inventory<select value={sort} onChange={(event) => onSortChange(event.target.value as VehicleSort)}><option value="newest">Newest added</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="stock-asc">Stock: low to high</option><option value="stock-desc">Stock: high to low</option></select></label>
      <div className="filter-actions">
        <button className="button button-primary" type="submit" disabled={loading}>Search inventory</button>
        <button className="button button-secondary" type="button" onClick={clear} disabled={loading}>Clear</button>
      </div>
    </form>
  );
}
