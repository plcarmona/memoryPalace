import * as THREE from 'three'

export const builtInShapes = {
  cube: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 16, 16),
  cylinder: () => new THREE.CylinderGeometry(0.5, 1, 16),
  cone: () => new THREE.ConeGeometry(0.5, 1, 16),
  torus: () => new THREE.TorusGeometry(0.6, 0.2, 16, 32),
}

export type BuiltInShape = keyof typeof builtInShapes

export function createBuiltInMesh(type: BuiltInShape): THREE.Mesh {
  const geometry = builtInShapes[type]()
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#4a9eff' }))
}