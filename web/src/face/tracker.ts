import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { Emotion } from '../rig/features'
import { simulatedShapes, type Shapes } from './score'

// One front-camera stream and one MediaPipe Face Landmarker for the whole app.
// The camera picture is read frame by frame on the device and never stored.

export type TrackerState = 'off' | 'starting' | 'on' | 'denied' | 'failed'

export interface Frame {
  present: boolean
  shapes: Shapes
  /** Rough face width as a share of the picture width, for "come closer" hints. */
  size: number
  time: number
}

const SIM = new URLSearchParams(window.location.search).has('sim')
const EMPTY: Frame = { present: false, shapes: {}, size: 0, time: 0 }

class FaceTracker {
  state: TrackerState = 'off'
  frame: Frame = EMPTY
  stream: MediaStream | null = null
  /** ?sim=1 only: the face the fake camera makes. */
  simTarget: Emotion | null = null
  private simAmount = 0
  private video: HTMLVideoElement | null = null
  private landmarker: FaceLandmarker | null = null
  private raf = 0
  private lastVideoTime = -1
  private starting: Promise<TrackerState> | null = null
  private listeners = new Set<() => void>()

  readonly simulated = SIM

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getState = (): TrackerState => this.state

  private setState(s: TrackerState): void {
    this.state = s
    this.listeners.forEach((l) => l())
  }

  /** Asks for the camera (the browser shows its prompt) and loads the model. */
  start(): Promise<TrackerState> {
    if (this.state === 'on') return Promise.resolve('on')
    this.starting ??= this.open().finally(() => (this.starting = null))
    return this.starting
  }

  private async open(): Promise<TrackerState> {
    this.setState('starting')
    if (SIM) {
      this.setState('on')
      this.loop()
      return 'on'
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
    } catch {
      this.setState('denied')
      return 'denied'
    }
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const base = import.meta.env.BASE_URL
      const files = await FilesetResolver.forVisionTasks(`${base}mediapipe`)
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate },
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(files, options('GPU'))
      } catch {
        this.landmarker = await FaceLandmarker.createFromOptions(files, options('CPU'))
      }
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.srcObject = this.stream
      await video.play()
      this.video = video
    } catch (err) {
      console.error('Face tracking failed to start', err)
      this.stop()
      this.setState('failed')
      return 'failed'
    }
    this.setState('on')
    this.loop()
    return 'on'
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    if (SIM) {
      // ease toward the target face over about two seconds
      this.simAmount += ((this.simTarget ? 1 : 0) - this.simAmount) * 0.03
      this.frame = { present: true, shapes: simulatedShapes(this.simTarget, this.simAmount), size: 0.4, time: now }
      return
    }
    const video = this.video
    if (!video || !this.landmarker || video.readyState < 2 || video.currentTime === this.lastVideoTime) return
    this.lastVideoTime = video.currentTime
    const result = this.landmarker.detectForVideo(video, now)
    const cats = result.faceBlendshapes?.[0]?.categories
    if (!cats) {
      this.frame = { present: false, shapes: this.frame.shapes, size: 0, time: now }
      return
    }
    const shapes: Shapes = {}
    for (const c of cats) shapes[c.categoryName] = c.score
    const pts = result.faceLandmarks[0]
    // landmarks 234 and 454 are the two sides of the face
    const size = pts ? Math.abs(pts[454].x - pts[234].x) : 0
    this.frame = { present: true, shapes, size, time: now }
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.video = null
    this.landmarker?.close()
    this.landmarker = null
    this.frame = EMPTY
    if (this.state === 'on') this.setState('off')
  }
}

export const tracker = new FaceTracker()
