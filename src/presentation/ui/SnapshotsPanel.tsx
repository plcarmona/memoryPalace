import { useEffect, useState } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import type { SnapshotInfo } from '../../domain/interfaces/IPersistence'

interface SnapshotsPanelProps {
  onClose: () => void
}

export function SnapshotsPanel({ onClose }: SnapshotsPanelProps) {
  const { saveSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot } = usePalaceStore()
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setSnapshots(await listSnapshots())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots')
    }
  }

  useEffect(() => { refresh() }, [])

  const handleSave = async () => {
    setBusy('save')
    setError(null)
    try {
      await saveSnapshot(label || undefined)
      setLabel('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(null)
    }
  }

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this snapshot? Current state will be replaced (you can still undo-protect by exporting first).')) return
    setBusy(id)
    setError(null)
    try {
      await restoreSnapshot(id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore')
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot permanently?')) return
    setBusy(`del-${id}`)
    setError(null)
    try {
      await deleteSnapshot(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 48, right: 16, bottom: 16, width: 320,
      background: 'rgba(20,20,35,0.97)', borderRadius: 8, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12, zIndex: 300,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: 14 }}>Snapshots</h3>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: 18, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Optional label..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
            color: '#fff', padding: '6px 8px', fontSize: 12, outline: 'none',
          }}
        />
        <button
          onClick={handleSave}
          disabled={busy === 'save'}
          style={{
            background: busy === 'save' ? '#666' : '#4a9eff', border: 'none',
            color: '#fff', borderRadius: 4, padding: '6px 12px',
            cursor: busy === 'save' ? 'not-allowed' : 'pointer', fontSize: 12,
          }}
        >{busy === 'save' ? '...' : 'Save'}</button>
      </div>

      {error && (
        <div style={{ color: '#ff6666', fontSize: 11 }}>{error}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {snapshots.length === 0 && (
          <div style={{ color: '#666', fontSize: 11, padding: 16, textAlign: 'center' }}>
            No snapshots yet. Click "Save" to checkpoint the current state.
          </div>
        )}
        {snapshots.map(snap => (
          <div key={snap.id} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6,
            padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#ddd', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {snap.label}
              </span>
              <span style={{ color: '#666', fontSize: 10, flexShrink: 0 }}>
                {new Date(snap.createdAt).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleRestore(snap.id)}
                disabled={busy === snap.id}
                style={{
                  flex: 1, background: busy === snap.id ? '#666' : 'rgba(74,158,255,0.2)',
                  border: '1px solid rgba(74,158,255,0.3)', color: '#4a9eff',
                  borderRadius: 4, padding: '4px 8px', cursor: busy === snap.id ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                }}
              >{busy === snap.id ? '...' : 'Restore'}</button>
              <button
                onClick={() => handleDelete(snap.id)}
                disabled={busy === `del-${snap.id}`}
                style={{
                  background: busy === `del-${snap.id}` ? '#666' : 'rgba(255,68,68,0.15)',
                  border: '1px solid rgba(255,68,68,0.3)', color: '#ff6666',
                  borderRadius: 4, padding: '4px 8px',
                  cursor: busy === `del-${snap.id}` ? 'not-allowed' : 'pointer', fontSize: 11,
                }}
              >{busy === `del-${snap.id}` ? '...' : 'Delete'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
