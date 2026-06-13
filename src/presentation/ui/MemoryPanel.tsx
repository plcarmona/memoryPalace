import { useState } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import { useUIStore } from '../../stores/uiStore'
import { ContentUseCase } from '../../application/ContentUseCase'

export function MemoryPanel() {
  const { activePanel, setActivePanel } = useUIStore()
  const { nodes, selectedElementId } = usePalaceStore()
  const [editText, setEditText] = useState<string | null>(null)

  if (activePanel !== 'memory-panel' || !selectedElementId) return null

  const useCase = new ContentUseCase(
    () => nodes,
    (updated) => usePalaceStore.setState({ nodes: updated })
  )

  const content = useCase.getContent(selectedElementId)
  const element = nodes.flatMap(n => n.elements).find(e => e.id === selectedElementId)

  if (!element) return null

  const handleClose = () => setActivePanel('none')

  const handleSaveText = () => {
    if (editText === null) return
    useCase.setContent(selectedElementId, {
      ...content,
      text: editText,
    })
    setEditText(null)
  }

  const isEditing = editText !== null

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ color: '#fff', fontWeight: 600 }}>Memory Content</span>
        <button onClick={handleClose} style={closeBtnStyle}>✕</button>
      </div>

      <div style={bodyStyle}>
        {/* Text */}
        <section>
          <h4 style={sectionTitleStyle}>Text</h4>
          {isEditing ? (
            <div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                style={textareaStyle}
                rows={4}
              />
              <button onClick={handleSaveText} style={saveBtnStyle}>Save</button>
              <button onClick={() => setEditText(null)} style={cancelBtnStyle}>Cancel</button>
            </div>
          ) : (
            <div
              onClick={() => setEditText(content?.text ?? '')}
              style={contentDisplayStyle}
            >
              {content?.text ? (
                <p style={{ color: '#ddd', whiteSpace: 'pre-wrap' }}>{content.text}</p>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>Click to add text...</p>
              )}
            </div>
          )}
        </section>

        {/* Audio */}
        <section>
          <h4 style={sectionTitleStyle}>Audio</h4>
          {content?.audioUrl ? (
            <audio controls src={content.audioUrl} style={{ width: '100%' }} />
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No audio attached</p>
          )}
        </section>

        {/* Images */}
        <section>
          <h4 style={sectionTitleStyle}>Images</h4>
          {content?.images && content.images.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {content.images.map((url, i) => (
                <img key={i} src={url} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No images attached</p>
          )}
        </section>

        {/* Link */}
        {element.link && (
          <section>
            <h4 style={sectionTitleStyle}>Portal Link</h4>
            <p style={{ color: '#4a9eff' }}>→ {element.link.targetNodeId}</p>
          </section>
        )}
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 48,
  bottom: 0,
  width: 320,
  background: 'rgba(15, 15, 25, 0.95)',
  borderLeft: '1px solid rgba(255,255,255,0.1)',
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
}

const bodyStyle: React.CSSProperties = {
  padding: 16,
  overflowY: 'auto',
  flex: 1,
}

const sectionTitleStyle: React.CSSProperties = {
  color: '#aaa',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
  marginBottom: 8,
}

const contentDisplayStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 6,
  padding: 12,
  cursor: 'pointer',
  minHeight: 48,
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  color: '#ddd',
  padding: 8,
  fontSize: 13,
  resize: 'vertical',
  marginBottom: 8,
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  fontSize: 16,
}

const saveBtnStyle: React.CSSProperties = {
  background: '#4a9eff',
  border: 'none',
  color: '#fff',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  marginRight: 8,
  fontSize: 12,
}

const cancelBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  color: '#aaa',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
}
