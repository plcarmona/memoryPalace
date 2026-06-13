import { useState } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import { useCameraStore } from '../../stores/cameraStore'
import { useUIStore } from '../../stores/uiStore'
import { GenerationUseCase } from '../../application/GenerationUseCase'
import { SDXLGenerator } from '../../infrastructure/generation/SDXLGenerator'
import { IndexedDBPersistence } from '../../infrastructure/persistence/IndexedDBPersistence'

export function Toolbar() {
  const { nodes, currentSceneId, addNode, removeNode, clearAll, isLoaded } = usePalaceStore()
  const { showOverview } = useCameraStore()
  const { editMode, setEditMode, recallMode, setRecallMode } = useUIStore()
  const [showGenForm, setShowGenForm] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genStatus, setGenStatus] = useState<string | null>(null)
  const [addImageInput, setAddImageInput] = useState<HTMLInputElement | null>(null)
  const [showAddObject, setShowAddObject] = useState(false)
  const [showLinkTo, setShowLinkTo] = useState(false)

  const selectedElementId = usePalaceStore(s => s.selectedElementId)
  const linkElement = usePalaceStore(s => s.linkElement)
  const currentScene = nodes.find(n => n.id === currentSceneId)
  const selectedElement = currentScene?.elements.find(e => e.id === selectedElementId)
  const otherScenes = nodes.filter(n => n.id !== currentSceneId)

  const handleAddScene = () => {
    const parentId = currentSceneId ?? null
    addNode('New Scene', parentId, [
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      0,
    ])
    if (!currentSceneId) {
      showOverview()
    }
  }

  const handleBackToOverview = () => {
    usePalaceStore.getState().setCurrentScene(null)
    showOverview()
  }

  const handleDeleteScene = () => {
    if (!currentSceneId) return
    removeNode(currentSceneId)
    showOverview()
  }

  const handleGenerate = async () => {
    if (!currentSceneId || !genPrompt.trim()) return

    setGenStatus('Generating...')
    try {
      const useCase = new GenerationUseCase(
        new SDXLGenerator(),
        new IndexedDBPersistence(),
        () => usePalaceStore.getState().nodes,
        (nodes) => usePalaceStore.setState({ nodes }),
        () => usePalaceStore.getState().currentSceneId
      )

      const position: [number, number, number] = [
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        0,
      ]

      await useCase.generateAndPlace(genPrompt, currentSceneId, position)
      setGenStatus('Done!')
      setGenPrompt('')
      setTimeout(() => { setGenStatus(null); setShowGenForm(false) }, 1500)
    } catch (err) {
      setGenStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      0,
    ]

    usePalaceStore.getState().addElement('image-plane', objectUrl, position)
    e.target.value = ''
  }

  const handleAddObject = (shape: string) => {
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      0,
    ]
    usePalaceStore.getState().addElement('3d-object', `builtin:${shape}`, position)
    setShowAddObject(false)
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      zIndex: 100,
    }}>
      <button onClick={handleBackToOverview} style={buttonStyle}>
        Overview
      </button>

      <button onClick={handleAddScene} style={buttonStyle}>
        {currentSceneId ? '+ Sub-scene' : '+ Scene'}
      </button>

      <button
        onClick={() => {
          if (nodes.length > 0 && !confirm('Clear all scenes and start a new palace?')) return
          clearAll()
          showOverview()
        }}
        style={{ ...buttonStyle, background: 'rgba(255,255,255,0.05)', color: '#888' }}
      >
        New Palace
      </button>

      {currentSceneId && (
        <>
          <button onClick={() => setShowAddObject(!showAddObject)} style={{
            ...buttonStyle,
            background: showAddObject ? '#4a9eff' : 'rgba(255,255,255,0.1)',
          }}>
            {showAddObject ? 'Cancel' : '+ Object'}
          </button>

          {showAddObject && (
            <div style={{
              position: 'absolute',
              top: 48,
              left: 0,
              background: 'rgba(20,20,35,0.95)',
              borderRadius: 8,
              padding: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              zIndex: 200,
            }}>
              {['cube', 'sphere', 'cylinder', 'cone', 'torus'].map(type => (
                <button
                  key={type}
                  onClick={() => handleAddObject(type)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ddd',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    textTransform: 'capitalize' as const,
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          <input
            type="file"
            ref={setAddImageInput}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <button onClick={() => addImageInput?.click()} style={buttonStyle}>
            + Image
          </button>

          <button onClick={() => setEditMode(!editMode)} style={{
            ...buttonStyle,
            background: editMode ? '#4a9eff' : 'rgba(255,255,255,0.1)',
          }}>
            {editMode ? 'Editing' : 'Edit'}
          </button>

          <button onClick={() => handleDeleteScene()} style={{
            ...buttonStyle,
            background: 'rgba(255, 68, 68, 0.2)',
          }}>
            🗑
          </button>

          {selectedElement && (
            <>
              <button onClick={() => setShowLinkTo(!showLinkTo)} style={{
                ...buttonStyle,
                background: showLinkTo ? '#44cc88' : selectedElement.link ? '#2a6644' : 'rgba(255,255,255,0.1)',
              }}>
                {selectedElement.link ? '🔗 Linked' : '🔗 Link'}
              </button>

              {selectedElement.link && (
                <button
                  onClick={() => {
                    const updated = nodes.map(n => ({
                      ...n,
                      elements: n.elements.map(e =>
                        e.id === selectedElement.id ? { ...e, link: undefined } : e
                      ),
                    }))
                    usePalaceStore.setState({ nodes: updated })
                  }}
                  style={{ ...buttonStyle, background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: 11 }}
                >
                  Unlink
                </button>
              )}

              {showLinkTo && (
                <div style={{
                  position: 'absolute',
                  top: 48,
                  left: 0,
                  background: 'rgba(20,20,35,0.95)',
                  borderRadius: 8,
                  padding: 8,
                  maxHeight: 300,
                  overflowY: 'auto',
                  minWidth: 160,
                  zIndex: 200,
                }}>
                  <div style={{ color: '#666', fontSize: 10, padding: '4px 8px', textTransform: 'uppercase' }}>
                    Link to scene
                  </div>
                  {otherScenes.length === 0 && (
                    <div style={{ color: '#555', fontSize: 11, padding: '8px' }}>
                      No other scenes. Create one first.
                    </div>
                  )}
                  {otherScenes.map(scene => (
                    <button
                      key={scene.id}
                      onClick={() => {
                        linkElement(selectedElement.id, scene.id)
                        setShowLinkTo(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        background: selectedElement.link?.targetNodeId === scene.id
                          ? 'rgba(68, 204, 136, 0.3)'
                          : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ddd',
                        padding: '6px 10px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        textAlign: 'left',
                        marginBottom: 4,
                      }}
                    >
                      {scene.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button onClick={() => setShowGenForm(!showGenForm)} style={{
            ...buttonStyle,
            background: showGenForm ? '#ff8844' : 'rgba(255,255,255,0.1)',
          }}>
            🎨 Generate
          </button>
        </>
      )}

      <button onClick={() => setRecallMode(!recallMode)} style={{
        ...buttonStyle,
        background: recallMode ? '#ff6644' : 'rgba(255,255,255,0.1)',
      }}>
        {recallMode ? 'Stop Recall' : '🧠 Recall'}
      </button>

      <span style={{ color: '#888', marginLeft: 'auto', fontSize: 12 }}>
        {!isLoaded && 'Loading...'}
        {isLoaded && `${nodes.length} scene${nodes.length !== 1 ? 's' : ''}`}
        {isLoaded && currentSceneId && ' · ' + (nodes.find(n => n.id === currentSceneId)?.label ?? '')}
      </span>

      {showGenForm && (
        <div style={{
          position: 'absolute',
          top: 48,
          right: 16,
          background: 'rgba(20,20,35,0.95)',
          borderRadius: 8,
          padding: 12,
          display: 'flex',
          gap: 8,
          zIndex: 200,
        }}>
          <input
            type="text"
            value={genPrompt}
            onChange={e => setGenPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Describe image..."
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: '#fff',
              padding: '6px 10px',
              width: 240,
              fontSize: 13,
            }}
          />
          <button onClick={handleGenerate} disabled={!!genStatus} style={{
            background: genStatus ? '#666' : '#ff8844',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 4,
            cursor: genStatus ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}>
            {genStatus ?? 'Go'}
          </button>
        </div>
      )}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
}