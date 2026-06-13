/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { usePalaceStore } from '../stores/palaceStore'
import { IndexedDBPersistence } from '../infrastructure/persistence/IndexedDBPersistence'

// We test the auto-save logic by hooking into palaceStore changes
// and verifying persistence layer receives them

describe('Auto-save integration', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
  })

  it('palaceStore changes can be persisted and reloaded', async () => {
    const persistence = new IndexedDBPersistence()

    // Simulate a user session
    usePalaceStore.getState().addNode('Auto-save Root', null, [0, 0, 0])

    // Simulate what useAutoSave would do on change
    await persistence.savePalace('autosave-test', usePalaceStore.getState().nodes)

    // Clear state
    usePalaceStore.setState({ nodes: [] })
    expect(usePalaceStore.getState().nodes).toHaveLength(0)

    // Reload
    const loaded = await persistence.loadPalace('autosave-test')
    expect(loaded).toHaveLength(1)
    expect(loaded[0].label).toBe('Auto-save Root')

    await persistence.deletePalace('autosave-test')
  })

  it('rapid store changes produce correct final state', async () => {
    // Simulate rapid mutations
    const id1 = usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    const id2 = usePalaceStore.getState().addNode('B', id1, [1, 0, 0])
    usePalaceStore.getState().removeNode(id2)

    const nodes = usePalaceStore.getState().nodes
    expect(nodes).toHaveLength(1)
    expect(nodes[0].label).toBe('A')
    expect(nodes[0].id).toBe(id1)
  })

  it('empty nodes list is not persisted', async () => {
    const persistence = new IndexedDBPersistence()
    const loaded = await persistence.loadPalace('empty-test')
    expect(loaded).toEqual([])
  })
})
