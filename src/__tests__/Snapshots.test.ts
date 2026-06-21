/**
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto'
import { usePalaceStore } from '../stores/palaceStore'
import { IndexedDBPersistence } from '../infrastructure/persistence/IndexedDBPersistence'

describe('Snapshots (IndexedDB)', () => {
  let persistence: IndexedDBPersistence

  beforeEach(async () => {
    persistence = new IndexedDBPersistence()
    usePalaceStore.setState({
      nodes: [],
      currentSceneId: null,
      selectedElementId: null,
      isLoaded: true,
    })
    usePalaceStore.temporal.getState().clear()
    // Clear any leftover snapshots from previous test runs
    const existing = await persistence.listSnapshots('default')
    await Promise.all(existing.map(s => persistence.deleteSnapshot(s.id)))
    const otherExisting = await persistence.listSnapshots('other-palace')
    await Promise.all(otherExisting.map(s => persistence.deleteSnapshot(s.id)))
  })

  it('saveSnapshot stores nodes and returns SnapshotInfo', async () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    const snap = await usePalaceStore.getState().saveSnapshot('first')

    expect(snap).not.toBeNull()
    expect(snap!.label).toBe('first')
    expect(snap!.palaceId).toBe('default')
    expect(snap!.createdAt).toBeGreaterThan(0)
  })

  it('listSnapshots returns saved snapshots, newest first', async () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    await usePalaceStore.getState().saveSnapshot('A')
    // tiny delay so timestamps differ
    await new Promise(r => setTimeout(r, 5))
    await usePalaceStore.getState().saveSnapshot('B')

    const list = await usePalaceStore.getState().listSnapshots()
    expect(list).toHaveLength(2)
    expect(list[0].label).toBe('B')
    expect(list[1].label).toBe('A')
  })

  it('listSnapshots is scoped to palaceId', async () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    await usePalaceStore.getState().saveSnapshot('mine')
    // Save a snapshot for a different palace directly
    await persistence.saveSnapshot('snap-other', 'other-palace', 'theirs', [])

    const list = await usePalaceStore.getState().listSnapshots()
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe('mine')
  })

  it('restoreSnapshot replaces nodes and clears undo history', async () => {
    usePalaceStore.getState().addNode('Before', null, [0, 0, 0])
    await usePalaceStore.getState().saveSnapshot('baseline')

    usePalaceStore.getState().addNode('Extra', null, [10, 0, 0])
    expect(usePalaceStore.getState().nodes).toHaveLength(2)
    expect(usePalaceStore.temporal.getState().pastStates.length).toBeGreaterThan(0)

    const list = await usePalaceStore.getState().listSnapshots()
    await usePalaceStore.getState().restoreSnapshot(list[0].id)

    expect(usePalaceStore.getState().nodes).toHaveLength(1)
    expect(usePalaceStore.getState().nodes[0].label).toBe('Before')
    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('restoreSnapshot clears selection', async () => {
    const id = usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(id)
    usePalaceStore.getState().setSelectedElement('foo')
    await usePalaceStore.getState().saveSnapshot('s1')

    const list = await usePalaceStore.getState().listSnapshots()
    await usePalaceStore.getState().restoreSnapshot(list[0].id)

    expect(usePalaceStore.getState().currentSceneId).toBeNull()
    expect(usePalaceStore.getState().selectedElementId).toBeNull()
  })

  it('deleteSnapshot removes the snapshot', async () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    await usePalaceStore.getState().saveSnapshot('temp')

    const list = await usePalaceStore.getState().listSnapshots()
    expect(list).toHaveLength(1)

    await usePalaceStore.getState().deleteSnapshot(list[0].id)

    const after = await usePalaceStore.getState().listSnapshots()
    expect(after).toHaveLength(0)
  })

  it('uses default label when none provided', async () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    const snap = await usePalaceStore.getState().saveSnapshot()
    expect(snap!.label).toBeTruthy()
    expect(snap!.label.length).toBeGreaterThan(0)
  })
})
