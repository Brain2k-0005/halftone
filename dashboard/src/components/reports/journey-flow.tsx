import { useMemo, useState } from "react"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface JourneyPath {
  items: (string | null)[]
  count: number
}

const COL_WIDTH = 176
const COL_GAP = 72
const NODE_GAP = 8
const MAX_HEIGHT = 440
const MAX_NODES = 10
const MIN_NODE = 36

interface Node {
  col: number
  name: string
  count: number
  y: number
  h: number
  /** Running offsets so links stack inside the node. */
  outOffset: number
  inOffset: number
}

interface Link {
  key: string
  from: Node
  to: Node
  count: number
  /** Count of that link which belongs to paths through the selected node. */
  active: number
  fromY: number
  toY: number
  width: number
}

/** Sankey-like flow: columns = steps, nodes = pages/events, links = how many visitors moved between them. */
export function JourneyFlow({
  paths,
  steps,
}: {
  paths: JourneyPath[]
  steps: number
}) {
  const [selected, setSelected] = useState<{
    col: number
    name: string
  } | null>(null)

  const layout = useMemo(() => {
    // Top nodes per column.
    const totals: Map<string, number>[] = Array.from(
      { length: steps },
      () => new Map()
    )
    for (const p of paths) {
      p.items.forEach((name, col) => {
        if (name && col < steps)
          totals[col]!.set(name, (totals[col]!.get(name) ?? 0) + p.count)
      })
    }
    const kept = totals.map(
      (m) =>
        new Set(
          [...m.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_NODES)
            .map(([n]) => n)
        )
    )
    const columnSum = totals.map((m, c) =>
      [...m.entries()]
        .filter(([n]) => kept[c]!.has(n))
        .reduce((s, [, v]) => s + v, 0)
    )
    const maxSum = Math.max(1, ...columnSum)
    const maxNodes = Math.max(1, ...kept.map((k) => k.size))
    const scale = (MAX_HEIGHT - (maxNodes - 1) * NODE_GAP) / maxSum

    const columns: Node[][] = totals.map((m, col) => {
      let y = 0
      return [...m.entries()]
        .filter(([n]) => kept[col]!.has(n))
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => {
          const h = Math.max(MIN_NODE, count * scale)
          const node: Node = {
            col,
            name,
            count,
            y,
            h,
            outOffset: 0,
            inOffset: 0,
          }
          y += h + NODE_GAP
          return node
        })
    })
    const byKey = new Map(columns.flat().map((n) => [`${n.col}:${n.name}`, n]))

    // Aggregate links between neighbouring columns.
    const linkMap = new Map<
      string,
      { from: Node; to: Node; count: number; active: number }
    >()
    for (const p of paths) {
      for (let c = 0; c < steps - 1; c++) {
        const a = p.items[c]
        const b = p.items[c + 1]
        if (!a || !b) continue
        const from = byKey.get(`${c}:${a}`)
        const to = byKey.get(`${c + 1}:${b}`)
        if (!from || !to) continue
        const k = `${c}:${a}>${b}`
        const entry = linkMap.get(k) ?? { from, to, count: 0, active: 0 }
        entry.count += p.count
        if (selected && p.items[selected.col] === selected.name)
          entry.active += p.count
        linkMap.set(k, entry)
      }
    }
    const links: Link[] = [...linkMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, l]) => {
        const width = Math.max(1.5, l.count * scale)
        const fromY = l.from.y + l.from.outOffset + width / 2
        const toY = l.to.y + l.to.inOffset + width / 2
        l.from.outOffset += width
        l.to.inOffset += width
        return { key, ...l, fromY, toY, width }
      })

    const height = Math.max(
      ...columns.map((c) =>
        c.length ? c[c.length - 1]!.y + c[c.length - 1]!.h : 0
      ),
      80
    )
    return { columns, links, height }
  }, [paths, steps, selected])

  const width = steps * COL_WIDTH + (steps - 1) * COL_GAP
  const colX = (col: number) => col * (COL_WIDTH + COL_GAP)

  // Nodes on any path through the selected node.
  const reachable = useMemo(() => {
    if (!selected) return null
    const set = new Set<string>()
    for (const p of paths) {
      if (p.items[selected.col] !== selected.name) continue
      p.items.forEach((n, c) => n && set.add(`${c}:${n}`))
    }
    return set
  }, [paths, selected])

  return (
    <div className="overflow-x-auto px-5 pb-5">
      <div
        className="relative mx-auto"
        style={{ width, height: layout.height + 28, paddingTop: 28 }}
      >
        {Array.from({ length: steps }, (_, c) => (
          <span
            key={c}
            className="absolute top-0 text-xs font-medium text-muted-foreground"
            style={{ left: colX(c), width: COL_WIDTH }}
          >
            Step {c + 1}
          </span>
        ))}
        <svg
          className="pointer-events-none absolute left-0"
          style={{ top: 28 }}
          width={width}
          height={layout.height}
          aria-hidden
        >
          {layout.links.map((l) => {
            const x1 = colX(l.from.col) + COL_WIDTH
            const x2 = colX(l.to.col)
            const mid = (x1 + x2) / 2
            const d = `M${x1},${l.fromY} C${mid},${l.fromY} ${mid},${l.toY} ${x2},${l.toY}`
            const dim = !!selected && l.active === 0
            return (
              <g key={l.key}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={l.width}
                  strokeOpacity={selected ? (dim ? 0.05 : 0.14) : 0.2}
                />
                {selected && l.active > 0 && (
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth={Math.max(1.5, l.width * (l.active / l.count))}
                    strokeOpacity={0.55}
                  />
                )}
              </g>
            )
          })}
        </svg>
        {layout.columns.flat().map((n) => {
          const isSelected = selected?.col === n.col && selected.name === n.name
          const dim = reachable && !reachable.has(`${n.col}:${n.name}`)
          return (
            <button
              key={`${n.col}:${n.name}`}
              type="button"
              title={`${n.name} · ${formatNumber(n.count)}`}
              aria-pressed={isSelected}
              onClick={() =>
                setSelected(isSelected ? null : { col: n.col, name: n.name })
              }
              className={cn(
                "absolute flex flex-col justify-center overflow-hidden rounded-md border bg-card px-2.5 text-left shadow-xs transition-opacity hover:border-brand/60",
                isSelected && "border-brand ring-2 ring-brand/30",
                dim && "opacity-35"
              )}
              style={{
                left: colX(n.col),
                top: 28 + n.y,
                width: COL_WIDTH,
                height: n.h,
              }}
            >
              <span className="truncate text-xs font-semibold">{n.name}</span>
              <span className="tabular truncate text-[11px] text-muted-foreground">
                {formatNumber(n.count)} visitors
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
