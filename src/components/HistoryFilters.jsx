import { Search, X } from 'lucide-react'

export const TIME_FILTERS = ['All time', 'Last 30 days', 'Last 7 days']
export const PERF_FILTERS = ['All', 'Above baseline', 'Below baseline']
export const SORT_OPTIONS = [
  { value: 'recent',  label: 'Most recent' },
  { value: 'lift',    label: 'Best lift' },
  { value: 'views',   label: 'Most views (7d)' },
  { value: 'oldest',  label: 'Oldest first' },
]

export default function HistoryFilters({
  query, onQueryChange,
  timeFilter, onTimeFilterChange,
  perfFilter, onPerfFilterChange,
  sort, onSortChange,
  resultCount,
}) {
  const hasQuery = query.length > 0

  return (
    <div style={{ padding: '0 16px', marginBottom: 12 }}>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search
          size={14}
          strokeWidth={2}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search title or artist…"
          style={{
            width: '100%',
            padding: '9px 32px 9px 34px',
            borderRadius: 8,
            background: 'var(--surface2)',
            border: '1px solid var(--border, rgba(255,255,255,0.06))',
            color: 'var(--light)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        {hasQuery && (
          <button
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)',
              padding: 4, cursor: 'pointer', display: 'flex',
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Time-window pills */}
      <PillRow
        options={TIME_FILTERS}
        value={timeFilter}
        onChange={onTimeFilterChange}
      />

      {/* Performance pills */}
      <div style={{ marginTop: 6 }}>
        <PillRow
          options={PERF_FILTERS}
          value={perfFilter}
          onChange={onPerfFilterChange}
          tone="secondary"
        />
      </div>

      {/* Sort + result count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, gap: 8,
      }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {resultCount} result{resultCount === 1 ? '' : 's'}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
          Sort
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value)}
            style={{
              background: 'var(--surface2)',
              color: 'var(--light)',
              border: '1px solid var(--border, rgba(255,255,255,0.06))',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function PillRow({ options, value, onChange, tone = 'primary' }) {
  const activeBg = tone === 'secondary' ? 'var(--secondary)' : 'var(--primary)'
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '5px 12px', borderRadius: 100,
            fontSize: 11, fontWeight: 700,
            background: value === opt ? activeBg : 'var(--surface2)',
            color:      value === opt ? '#fff'   : 'var(--gray)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
