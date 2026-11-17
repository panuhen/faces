import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { FEATURES, type Weights } from '../rig/features'

const FLAT_MATERIALS = new Set(['EyeWhite', 'Iris', 'Pupil', 'Highlight', 'Mouth', 'Shine', 'Lash'])
// Decals and thin parts: an outline would make them look heavy
const NO_OUTLINE = new Set(['Highlight', 'Shine', 'Cream', 'Stripe', 'EarInner', 'Whisker', 'Lid', 'Lash'])
// Painted eyes: the whites mark the stencil, lids and lash lines draw only there,
// on top, so a sliding lid covers the eye and never shows on the skin around it.
const EYE_ORDER: Record<string, number> = { EyeWhite: 1, Iris: 2, Pupil: 3, Highlight: 4, Lid: 5, Lash: 6 }

function toonGradient(): THREE.DataTexture {
  // Two tones: shadow and lit. Nearest filtering keeps the cel steps hard.
  const data = new Uint8Array([178, 178, 178, 255, 255, 255, 255, 255])
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

export interface Tile {
  x: number
  y: number
  w: number
  h: number
  weights: Weights
}

/**
 * One cel-shaded character: GLB with feature clips played additively.
 * setWeights() poses the face; render() or renderTiles() draws it.
 */
export class CharacterStage {
  readonly renderer: THREE.WebGLRenderer
  private readonly effect: OutlineEffect
  readonly scene = new THREE.Scene()
  readonly camera: THREE.OrthographicCamera
  private mixer: THREE.AnimationMixer | null = null
  private actions = new Map<string, THREE.AnimationAction>()
  root: THREE.Object3D | null = null
  background = new THREE.Color('#fff7e8')

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.effect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0045,
      defaultColor: [0.12, 0.08, 0.1],
      defaultAlpha: 1,
    })
    // Framing: head and body, front view
    this.camera = new THREE.OrthographicCamera(-0.8, 0.8, 1.55, -0.05, 0.1, 20)
    // Camera sits at y = 0 looking down -Z, so top/bottom are world heights.
    this.camera.position.set(0, 0, 5)

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(-1, 1.6, 4)
    this.scene.add(key)
  }

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url)
    const root = gltf.scene
    const gradient = toonGradient()
    // Painted eyes (a 'Lid' material): iris and pupil lose their outlines, which
    // the outline pass would otherwise draw on top of a closing lid.
    let painted = false
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined
      if ((o as THREE.Mesh).isMesh && m?.name === 'Lid') painted = true
    })
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false
      const src = mesh.material as THREE.MeshStandardMaterial
      const name = src.name
      const mat = FLAT_MATERIALS.has(name)
        ? new THREE.MeshBasicMaterial({ color: src.color })
        : new THREE.MeshToonMaterial({ color: src.color, gradientMap: gradient })
      mat.name = name
      if (NO_OUTLINE.has(name) || (painted && (name === 'Iris' || name === 'Pupil')))
        mat.userData.outlineParameters = { visible: false }
      if (name === 'Mouth') mat.userData.outlineParameters = { thickness: 0.003 }
      if (name in EYE_ORDER) mesh.renderOrder = EYE_ORDER[name]
      if (name === 'EyeWhite') {
        mat.stencilWrite = true
        mat.stencilRef = 1
        mat.stencilFunc = THREE.AlwaysStencilFunc
        mat.stencilZPass = THREE.ReplaceStencilOp
      } else if (name === 'Lid' || name === 'Lash') {
        mat.stencilWrite = true // enables the stencil test; ops keep the buffer as is
        mat.stencilRef = 1
        mat.stencilFunc = THREE.EqualStencilFunc
        mat.stencilZPass = THREE.KeepStencilOp
        mat.depthTest = false
      }
      mesh.material = mat
    })
    if (this.root) this.scene.remove(this.root)
    this.root = root
    this.scene.add(root)

    this.mixer = new THREE.AnimationMixer(root)
    this.actions.clear()
    for (const clip of gltf.animations) {
      const additive = THREE.AnimationUtils.makeClipAdditive(clip.clone(), 0)
      const action = this.mixer.clipAction(additive)
      action.blendMode = THREE.AdditiveAnimationBlendMode
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.play()
      action.paused = true
      action.time = additive.duration
      action.setEffectiveWeight(0)
      this.actions.set(clip.name, action)
    }
    const missing = FEATURES.filter((f) => !this.actions.has(f))
    if (missing.length) console.warn('GLB is missing feature clips:', missing)
  }

  setWeights(w: Weights): void {
    if (!this.mixer) return
    for (const [name, action] of this.actions) {
      const v = w[name as keyof Weights] ?? 0
      action.setEffectiveWeight(Math.max(0, Math.min(1.5, v)))
    }
    this.mixer.update(0)
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    const h = 1.6
    this.camera.left = (-h * aspect) / 2
    this.camera.right = (h * aspect) / 2
    this.camera.top = 1.55
    this.camera.bottom = -0.05
    this.camera.updateProjectionMatrix()
  }

  render(): void {
    this.renderer.setScissorTest(false)
    this.renderer.setClearColor(this.background)
    this.effect.render(this.scene, this.camera)
  }

  /** Draw several poses of the same character into one canvas (gallery). */
  renderTiles(tiles: Tile[], canvasHeight: number, frame: { top: number; bottom: number }): void {
    const r = this.renderer
    r.setScissorTest(true)
    r.setClearColor(this.background)
    for (const t of tiles) {
      this.setWeights(t.weights)
      const y = canvasHeight - t.y - t.h // WebGL origin is bottom-left
      r.setViewport(t.x, y, t.w, t.h)
      r.setScissor(t.x, y, t.w, t.h)
      const aspect = t.w / t.h
      const hgt = frame.top - frame.bottom
      this.camera.left = (-hgt * aspect) / 2
      this.camera.right = (hgt * aspect) / 2
      this.camera.top = frame.top
      this.camera.bottom = frame.bottom
      this.camera.updateProjectionMatrix()
      this.effect.render(this.scene, this.camera)
    }
    r.setScissorTest(false)
  }

  dispose(): void {
    this.renderer.dispose()
  }
}
