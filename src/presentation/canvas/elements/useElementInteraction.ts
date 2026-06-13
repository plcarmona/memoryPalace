import { usePalaceStore } from '../../../stores/palaceStore'
import { useCameraStore } from '../../../stores/cameraStore'
import { useUIStore } from '../../../stores/uiStore'
import { useRecallStore } from '../../../stores/recallStore'
import { PalaceElement } from '../../../domain/models'

export function useElementInteraction(element: PalaceElement, isSelected: boolean, onSelect: () => void) {
  const { setSelectedElement } = usePalaceStore()
  const { navigateToLinkedElement } = useCameraStore()
  const { setActivePanel } = useUIStore()
  const { isActive: recallActive, setCurrentRevealElement } = useRecallStore()

  const isContentHidden = element.hiddenContent && element.contentRevealed === false

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onSelect()

    if (isContentHidden && recallActive) {
      setCurrentRevealElement(element.id)
      return
    }

    if (element.link?.targetNodeId && !isSelected) {
      setSelectedElement(null)
      navigateToLinkedElement(element.id)
    }
  }

  const handleDoubleClick = () => {
    if (element.hiddenContent && !isContentHidden) {
      setActivePanel('memory-panel')
    }
  }

  const showPortalGlow = !!element.link
  const showContentIndicator = !!element.hiddenContent
  const showHiddenIndicator = isContentHidden

  return {
    isSelected,
    handleClick,
    handleDoubleClick,
    showPortalGlow,
    showContentIndicator,
    showHiddenIndicator,
  }
}
