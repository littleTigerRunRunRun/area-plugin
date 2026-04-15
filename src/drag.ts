import { Position } from './types'
import { PointerListener, usePointerListener } from './utils'

type Events = {
  start: (e: PointerEvent) => void
  translate: (x: number, y: number, e: PointerEvent) => unknown
  drag: (e: PointerEvent) => void
  rectSelect: (start?:Position, end?:Position) => void
}

type Guards = {
  down: (e: PointerEvent) => boolean
  move: (e: PointerEvent) => boolean
}

type DragConfig = {
  getCurrentPosition: () => Position
  getZoom: () => number
  isRectSelect?: () => boolean
}

/**
 * Drag handler, used to handle dragging of the area and nodes. Can be extended to add custom behavior.
 */
export class Drag {
  private pointerStart?: Position
  private pointerRectEnd?: Position
  private startPosition?: Position
  private pointerListener!: PointerListener
  protected config!: DragConfig
  protected events!: Events
  protected guards: Guards

  constructor(guards?: Guards) {
    this.guards = guards || {
      down: e => !(e.pointerType === 'mouse' && e.button !== 0),
      move: () => true
    }
  }

  public initialize(element: HTMLElement, config: DragConfig, events: Events) {
    this.config = config
    this.events = events
    element.style.touchAction = 'none'
    this.pointerListener = usePointerListener(element, {
      down: this.down,
      move: this.move,
      up: this.up
    })
  }

  private down = (e: PointerEvent) => {
    if (!this.guards.down(e)) return

    e.stopPropagation()
    this.pointerStart = { x: e.pageX, y: e.pageY }

    if (this.config.isRectSelect && this.config.isRectSelect()) {
      // 说明正在发起一次框选
      this.pointerRectEnd = { x: e.pageX, y: e.pageY }
      this.events.rectSelect(this.pointerStart, this.pointerRectEnd)
      return
    }

    this.startPosition = { ...this.config.getCurrentPosition() }

    this.events.start(e)
  }

  private move = (e: PointerEvent) => {
    if (this.pointerRectEnd && this.pointerStart) {
      this.pointerRectEnd.x = e.pageX
      this.pointerRectEnd.y = e.pageY
      this.events.rectSelect(this.pointerStart, this.pointerRectEnd)
      return
    }
    if (!this.pointerStart || !this.startPosition) return
    if (!this.guards.move(e)) return
    e.preventDefault()

    const delta = {
      x: e.pageX - this.pointerStart.x,
      y: e.pageY - this.pointerStart.y
    }
    const zoom = this.config.getZoom()
    const x = this.startPosition.x + delta.x / zoom
    const y = this.startPosition.y + delta.y / zoom

    void this.events.translate(x, y, e)
  }

  private up = (e: PointerEvent) => {
    if (this.pointerRectEnd) {
      this.pointerRectEnd = undefined
      this.events.rectSelect()
      return
    }
    if (!this.pointerStart) return

    delete this.pointerStart
    this.events.drag(e)
  }

  public destroy() {
    this.pointerListener.destroy()
  }
}
