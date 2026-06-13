import { usePalaceStore } from '../../stores/palaceStore'
import { useCameraStore } from '../../stores/cameraStore'
import { useUIStore } from '../../stores/uiStore'
import { useRecallStore } from '../../stores/recallStore'
import { ContentUseCase } from '../../application/ContentUseCase'

export function RecallMode() {
  const { recallMode, setRecallMode } = useUIStore()
  const { nodes } = usePalaceStore()
  const { showOverview, focusNode } = useCameraStore()
  const {
    isActive,
    sceneOrder,
    currentSceneIndex,
    answers,
    waitingForAnswer,
    currentRevealElementId,
    startRecall,
    endRecall,
    nextScene,
    recordAnswer,
    setWaitingForAnswer,
    setCurrentRevealElement,
  } = useRecallStore()

  const useCase = new ContentUseCase(
    () => nodes,
    (updated) => usePalaceStore.setState({ nodes: updated })
  )

  if (!recallMode && !isActive) return null

  const scenesWithContent = nodes.filter(
    n => n.elements.some(e => e.hiddenContent)
  )

  const handleStartRecall = () => {
    if (scenesWithContent.length === 0) return
    startRecall(scenesWithContent.map(n => n.id))
    useCase.hideAllContent(scenesWithContent[0].id)
    focusNode(scenesWithContent[0].id)
    usePalaceStore.getState().setCurrentScene(scenesWithContent[0].id)
  }

  const handleEndRecall = () => {
    scenesWithContent.forEach(n => useCase.revealAllContent(n.id))
    endRecall()
    setRecallMode(false)
    showOverview()
    usePalaceStore.getState().setCurrentScene(null)
  }

  const handleReveal = (elementId: string) => {
    useCase.revealContent(elementId)
    setCurrentRevealElement(elementId)
    setWaitingForAnswer(true)
  }

  const handleAssess = (elementId: string, sceneId: string, correct: boolean) => {
    recordAnswer(elementId, sceneId, correct)
    setWaitingForAnswer(false)
    setCurrentRevealElement(null)
  }

  const handleNextScene = () => {
    const nextIdx = currentSceneIndex + 1
    if (nextIdx >= sceneOrder.length) return
    const nextSceneId = sceneOrder[nextIdx]
    useCase.hideAllContent(nextSceneId)
    usePalaceStore.getState().setCurrentScene(nextSceneId)
    focusNode(nextSceneId)
    nextScene()
  }

  // Summary screen
  const isFinished = isActive && currentSceneIndex >= sceneOrder.length - 1 && answers.length > 0 && !waitingForAnswer

  if (isFinished) {
    const correct = answers.filter(a => a.correct).length
    const total = answers.length
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: '#fff', marginBottom: 16 }}>Session Complete</h2>
          <p style={{ color: '#aaa', fontSize: 24, marginBottom: 8 }}>
            {correct}/{total}
          </p>
          <p style={{ color: correct === total ? '#44ff88' : '#ff6644', fontSize: 16, marginBottom: 24 }}>
            {correct === total ? 'Perfect!' : `${total - correct} item${total - correct > 1 ? 's' : ''} to review`}
          </p>
          {answers.filter(a => !a.correct).map(a => (
            <div key={a.elementId} style={{ color: '#ff6644', fontSize: 13, marginBottom: 4 }}>
              ✗ {a.elementId.slice(0, 8)}...
            </div>
          ))}
          <button onClick={handleEndRecall} style={endBtnStyle}>Done</button>
        </div>
      </div>
    )
  }

  // Active recall overlay per-scene
  if (isActive) {
    const currentScene = nodes.find(n => n.id === sceneOrder[currentSceneIndex])
    const elementsWithContent = currentScene?.elements.filter(e => e.hiddenContent) ?? []

    return (
      <div style={barStyle}>
        <span style={{ color: '#fff', fontWeight: 600 }}>
          Recall: Scene {currentSceneIndex + 1}/{sceneOrder.length}
        </span>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {elementsWithContent.map(el => (
            <button
              key={el.id}
              onClick={() => handleReveal(el.id)}
              style={{
                ...revealBtnStyle,
                background: currentRevealElementId === el.id ? '#4a9eff' : 'rgba(255,255,255,0.1)',
              }}
            >
              Reveal
            </button>
          ))}

          {waitingForAnswer && currentRevealElementId && (
            <>
              <button onClick={() => handleAssess(currentRevealElementId, sceneOrder[currentSceneIndex], true)} style={correctBtnStyle}>
                ✓ Got it
              </button>
              <button onClick={() => handleAssess(currentRevealElementId, sceneOrder[currentSceneIndex], false)} style={forgotBtnStyle}>
                ✗ Forgot
              </button>
            </>
          )}

          {!waitingForAnswer && answers.length > 0 && (
            <button onClick={handleNextScene} style={nextBtnStyle}>
              Next →
            </button>
          )}

          <button onClick={handleEndRecall} style={endBtnStyle}>End</button>
        </div>
      </div>
    )
  }

  // Start screen
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Recall Mode</h2>
        <p style={{ color: '#aaa', marginBottom: 8 }}>
          {scenesWithContent.length} scene{scenesWithContent.length !== 1 ? 's' : ''} with memory items
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleStartRecall} disabled={scenesWithContent.length === 0} style={startBtnStyle}>
            Start
          </button>
          <button onClick={() => setRecallMode(false)} style={endBtnStyle}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  top: 48,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 300,
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(20,20,35,0.95)',
  borderRadius: 12,
  padding: 32,
  minWidth: 300,
  textAlign: 'center',
}

const barStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 56,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  zIndex: 300,
}

const startBtnStyle: React.CSSProperties = {
  background: '#44ff88',
  color: '#000',
  border: 'none',
  padding: '8px 20px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
}

const endBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  color: '#aaa',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
}

const revealBtnStyle: React.CSSProperties = {
  border: 'none',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff',
  fontSize: 13,
}

const correctBtnStyle: React.CSSProperties = {
  background: '#44ff88',
  color: '#000',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
}

const forgotBtnStyle: React.CSSProperties = {
  background: '#ff6644',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
}

const nextBtnStyle: React.CSSProperties = {
  background: '#4a9eff',
  color: '#fff',
  border: 'none',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
}
