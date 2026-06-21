import { useState, useEffect, useRef, useMemo } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'

interface CommandPaletteProps {
  onSelect: (nodeId: string) => void
  onClose: () => void
  excludeNodeId?: string
}

export function fuzzyScore(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  let score = 0
  let prevMatch = false

  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += prevMatch ? 2 : 1
      qi++
      prevMatch = true
    } else {
      prevMatch = false
    }
  }

  return qi === q.length ? score : -1
}

export function CommandPalette({ onSelect, onClose, excludeNodeId }: CommandPaletteProps) {
  const nodes = usePalaceStore(s => s.nodes)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const candidates = nodes.filter(n => n.id !== excludeNodeId)
    return candidates
      .map(n => ({ node: n, score: fuzzyScore(query, n.label) }))
      .filter(r => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.node)
  }, [nodes, query, excludeNodeId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIdx]) {
        onSelect(results[selectedIdx].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 120, zIndex: 500,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440, maxHeight: 480,
          background: 'rgba(20,20,35,0.98)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#666', fontSize: 14 }}>🔗</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Link to scene..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 15,
            }}
          />
          <span style={{ color: '#444', fontSize: 11 }}>Esc to close</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 4 }}>
          {results.length === 0 && (
            <div style={{ color: '#555', fontSize: 13, padding: '16px', textAlign: 'center' }}>
              No scenes found
            </div>
          )}
          {results.map((node, i) => {
            const imageEl = node.elements.find(e => e.type === 'image-plane')
            const childCount = nodes.filter(n => n.parentId === node.id).length
            return (
              <div
                key={node.id}
                onClick={() => onSelect(node.id)}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  cursor: 'pointer',
                  background: i === selectedIdx ? 'rgba(74,158,255,0.15)' : 'transparent',
                }}
              >
                {imageEl ? (
                  <img src={imageEl.assetUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} draggable={false} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 6,
                    background: 'rgba(74,158,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4a9eff', fontSize: 14,
                  }}>◈</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ddd', fontSize: 13, fontWeight: 500 }}>{node.label}</div>
                  {childCount > 0 && (
                    <div style={{ color: '#666', fontSize: 10 }}>{childCount} sub-scenes</div>
                  )}
                </div>
                {i === selectedIdx && (
                  <span style={{ color: '#4a9eff', fontSize: 11 }}>↵</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
