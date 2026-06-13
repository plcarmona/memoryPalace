import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useCameraStore } from '../../../stores/cameraStore'

export function CameraController() {
  const camera = useThree().camera
  const { targetPosition, targetLookAt } = useCameraStore()

  useEffect(() => {
    const currentPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const currentLookAt = { x: camera.position.x, y: camera.position.y, z: camera.position.z - 1 }

    gsap.to(currentPosition, {
      x: targetPosition[0],
      y: targetPosition[1],
      z: targetPosition[2],
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.set(currentPosition.x, currentPosition.y, currentPosition.z)
      },
    })

    gsap.to(currentLookAt, {
      x: targetLookAt[0],
      y: targetLookAt[1],
      z: targetLookAt[2],
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z)
      },
    })

    return () => {
      gsap.killTweensOf(currentPosition)
      gsap.killTweensOf(currentLookAt)
    }
  }, [targetPosition, targetLookAt, camera])

  return null
}