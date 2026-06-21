import { useState, useEffect, useRef, useMemo } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import { useCameraStore } from '../../stores/cameraStore'
import { fuzzyScore } from './CommandPalette'

export interface Command {
  id: string
  title: string
  hint?: string
  icon?: string
  canExecute: () => boolean
  execute: () => void
}

interface CommandMenuProps {
  onClose: () => void
  onLink: () => void
  onSegment: (elementId: string) => void
}

export function CommandMenu({ onClose, onLink, onSegment }: CommandMenuProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allCommands = useMemo<Command[]>(() => {
    const store = usePalaceStore.getState()
    const cam = useCameraStore.getState()
    const { nodes, currentSceneId, selectedElementId, selectedElementIds } = store
    const scene = nodes.find(n => n.id === currentSceneId)
    const element = scene?.elements.find(e => e.id === selectedElementId)

    return [
      { id: 'new-scene', title: 'New Scene', icon: '◈', hint: '', canExecute: () => true,
        execute: () => {
          const parentId = currentSceneId ?? null
          const angle = Math.random() * Math.PI * 2
          const r = 300 + Math.random() * 200
          const bx = parentId ? nodes.find(n => n.id === parentId)?.position[0] ?? 0 : 0
          const by = parentId ? nodes.find(n => n.id === parentId)?.position[1] ?? 0 : 0
          store.addNode('New Scene', parentId, [bx + Math.cos(angle) * r, by + Math.sin(angle) * r, 0])
        }},
      { id: 'add-image', title: 'Add Image', icon: '🖼', canExecute: () => !!currentSceneId,
        execute: () => { document.getElementById('file-image-input')?.click() }},
      { id: 'add-text', title: 'Add Text', icon: '✏', canExecute: () => !!currentSceneId,
        execute: () => { store.addElement('text', 'New text', [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0]) }},
      { id: 'go-home', title: 'Go Home', icon: '⌂', canExecute: () => true,
        execute: () => cam.goHome() },
      { id: 'link', title: 'Link Element', icon: '🔗', hint: 'L', canExecute: () => !!selectedElementId,
        execute: () => onLink() },
      { id: 'segment', title: 'Segment Image', icon: '✂', hint: 'S', canExecute: () => element?.type === 'image-plane',
        execute: () => { if (selectedElementId) onSegment(selectedElementId) }},
      { id: 'lock', title: element?.locked ? 'Unlock Element' : 'Lock Element', icon: element?.locked ? '🔓' : '🔒', hint: 'F', canExecute: () => !!selectedElementId,
        execute: () => { if (selectedElementId) store.toggleLock(selectedElementId) }},
      { id: 'group', title: 'Group Selected', icon: '⊡', hint: 'G', canExecute: () => selectedElementIds.length >= 2,
        execute: () => store.groupElements(selectedElementIds) },
      { id: 'ungroup', title: 'Ungroup', icon: '⊟', hint: '⇧G', canExecute: () => !!element?.groupId,
        execute: () => { if (element?.groupId) store.ungroupElements(element.groupId) }},
      { id: 'delete-element', title: 'Delete Element', icon: '🗑', hint: 'Del', canExecute: () => !!selectedElementId,
        execute: () => { if (selectedElementId) store.removeElement(selectedElementId) }},
      { id: 'delete-scene', title: 'Delete Current Scene', icon: '🗑', canExecute: () => !!currentSceneId,
        execute: () => { if (currentSceneId) { store.removeNode(currentSceneId); cam.goHome() } }},
      { id: 'new-palace', title: 'New Palace', icon: '✦', canExecute: () => true,
        execute: () => { if (confirm('Clear all scenes?')) { store.clearAll() } }},
    ]
  }, [])

  const results = useMemo(() => {
    return allCommands
      .filter(c => c.canExecute())
      .map(c => ({ cmd: c, score: fuzzyScore(query, c.title) }))
      .filter(r => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.cmd)
  }, [allCommands, query])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); results[selectedIdx]?.execute(); onClose() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
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
          width: 460, maxHeight: 500,
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
          <span style={{ color: '#666', fontSize: 14 }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 15,
            }}
          />
          <span style={{ color: '#444', fontSize: 11 }}>Esc to close</span>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 4 }}>
          {results.length === 0 && (
            <div style={{ color: '#555', fontSize: 13, padding: '16px', textAlign: 'center' }}>
              No commands found
            </div>
          )}
          {results.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => { cmd.execute(); onClose() }}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                cursor: 'pointer',
                background: i === selectedIdx ? 'rgba(74,158,255,0.15)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{cmd.icon}</span>
              <span style={{ flex: 1, color: '#ddd', fontSize: 13 }}>{cmd.title}</span>
              {cmd.hint && (
                <span style={{
                  color: '#555', fontSize: 10,
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 6px', borderRadius: 3,
                }}>{cmd.hint}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
