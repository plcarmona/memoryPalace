import { createBuiltInMesh } from '../infrastructure/assets/AssetLibrary'
import type { BuiltInShape } from '../infrastructure/assets/AssetLibrary'

describe('AssetLibrary', () => {
  it('creates built-in meshes for all shape types', () => {
    const shapes: BuiltInShape[] = ['cube', 'sphere', 'cylinder', 'cone', 'torus']

    shapes.forEach(shape => {
      const mesh = createBuiltInMesh(shape)
      expect(mesh).toBeDefined()
      expect(mesh.geometry).toBeDefined()
      expect(mesh.material).toBeDefined()
    })
  })

  it('creates meshes with correct geometry types', () => {
    const cube = createBuiltInMesh('cube')
    expect(cube.geometry.type).toBe('BoxGeometry')

    const sphere = createBuiltInMesh('sphere')
    expect(sphere.geometry.type).toBe('SphereGeometry')

    const cylinder = createBuiltInMesh('cylinder')
    expect(cylinder.geometry.type).toBe('CylinderGeometry')

    const cone = createBuiltInMesh('cone')
    expect(cone.geometry.type).toBe('ConeGeometry')

    const torus = createBuiltInMesh('torus')
    expect(torus.geometry.type).toBe('TorusGeometry')
  })

  it('creates meshes with standard materials', () => {
    const cube = createBuiltInMesh('cube')
    expect(cube.material.type).toBe('MeshStandardMaterial')
  })
})