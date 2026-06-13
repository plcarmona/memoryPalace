import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import { usePalaceStore } from '../../../stores/palaceStore'
import { PalaceElement } from '../../../domain/models'

export const isDraggingGlobal = { value: false }

export function useDrag(element: PalaceElement, isSelected: boolean) {
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const dragOffset = useRef(new THREE.Vector3())
  const isDragging = useRef(false)
  const transformElement = usePalaceStore(s => s.transformElement)

  const onPointerDown = useCallback((e: any) => {
    if (e.nativeEvent?.button !== 1) return
    if (!isSelected) return
    e.stopPropagation()
    isDragging.current = true
    isDraggingGlobal.value = true

    const planeNormal = new THREE.Vector3(0, 0, 1)
    const elementPos = new THREE.Vector3(...element.position)
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, elementPos)

    const intersection = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, intersection)
    dragOffset.current.copy(intersection).sub(elementPos)
  }, [isSelected, element.position])

  const onPointerMove = useCallback((e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()

    const intersection = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, intersection)
    if (!intersection) return

    const newPos = intersection.sub(dragOffset.current)
    transformElement(element.id, {
      position: [newPos.x, Math.max(0, newPos.y), newPos.z],
      rotation: element.rotation,
      scale: element.scale,
    })
  }, [element.id, element.rotation, element.scale, transformElement])

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    isDraggingGlobal.value = false
  }, [])

  return {
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  }
}
