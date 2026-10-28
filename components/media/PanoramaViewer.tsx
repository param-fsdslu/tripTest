'use client'

/**
 * Interactive 360° viewer for an equirectangular (2:1) photo, in plain WebGL: every pixel's
 * view ray is turned into a longitude/latitude and looked up in the photo. Drag or swipe to
 * look around, pinch / ctrl+scroll / the buttons to zoom, arrow keys too. It turns slowly by
 * itself until touched (never with reduced motion) and only redraws while on screen.
 *
 * `src` must be same-origin or CORS-enabled (WebGL can't read other images): hotel pages pass
 * the next/image optimizer URL (hotel/PanoramaTour).
 */
import { useEffect, useRef, useState } from 'react'
import NextImage, { getImageProps } from 'next/image'
import { ImageOff, Loader2, Maximize2, Minimize2, Minus, Move, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A stored panorama URL served through the next/image optimizer: same-origin, so WebGL can read it */
export function panoramaViewerSrc(imageUrl: string): string {
  return getImageProps({ src: imageUrl, alt: '', width: 3840, height: 1920 }).props.src
}

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_pos;
void main() {
  v_pos = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_tex;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_tan;
uniform float u_aspect;
varying vec2 v_pos;
const float PI = 3.14159265358979;
void main() {
  vec3 d = normalize(vec3(v_pos.x * u_tan * u_aspect, v_pos.y * u_tan, -1.0));
  float cp = cos(u_pitch);
  float sp = sin(u_pitch);
  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(u_yaw);
  float sy = sin(u_yaw);
  d = vec3(d.x * cy - d.z * sy, d.y, d.x * sy + d.z * cy);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(u_tex, vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI));
}`

const DEG = Math.PI / 180
const FOV = { initial: 70 * DEG, min: 30 * DEG, max: 95 * DEG } // vertical field of view
const MAX_PITCH = 85 * DEG
const SPIN_PER_SECOND = 3 * DEG
const IDLE_BEFORE_SPIN_MS = 4000

type Status = 'loading' | 'ready' | 'error' | 'unsupported'

interface PanoramaViewerProps {
  src: string
  /** The panorama's own title, e.g. "Lobby" */
  title?: string | null
  /** Shown over the top-left corner of the view */
  hotelName?: string | null
  className?: string
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader')
  return shader
}

export function PanoramaViewer({ src, title, hotelName, className }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zoomRef = useRef<(factor: number) => void>(() => {})
  const [status, setStatus] = useState<Status>('loading')
  const [expanded, setExpanded] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) {
      setStatus('unsupported')
      return
    }

    let disposed = false
    let frame = 0
    let lastTime = 0
    let visible = true
    let lastInteraction = 0
    const spin = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const view = { yaw: 0, pitch: 0, fov: FOV.initial }
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance = 0

    // Program + a quad covering the canvas. React may mount twice on the same canvas (dev),
    // so cleanup deletes these objects rather than losing the context.
    const program = gl.createProgram()!
    const shaders = [compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER), compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)]
    shaders.forEach((shader) => gl.attachShader(program, shader))
    gl.linkProgram(program)
    gl.useProgram(program)
    const quad = gl.createBuffer()
    let texture: WebGLTexture | null = null
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const uYaw = uniform('u_yaw')
    const uPitch = uniform('u_pitch')
    const uTan = uniform('u_tan')
    const uAspect = uniform('u_aspect')

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.uniform1f(uYaw, view.yaw)
      gl.uniform1f(uPitch, view.pitch)
      gl.uniform1f(uTan, Math.tan(view.fov / 2))
      gl.uniform1f(uAspect, width / height)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const spinning = () => spin && visible && pointers.size === 0 && performance.now() - lastInteraction > IDLE_BEFORE_SPIN_MS

    const tick = (time: number) => {
      frame = 0
      if (disposed) return
      if (spinning() && lastTime) view.yaw += ((time - lastTime) / 1000) * SPIN_PER_SECOND
      lastTime = time
      draw()
      if (spinning()) frame = requestAnimationFrame(tick)
    }
    const requestDraw = () => {
      if (!frame && !disposed) {
        lastTime = 0
        frame = requestAnimationFrame(tick)
      }
    }
    // Spinning resumes on its own after a pause in interaction
    const idleTimer = window.setInterval(() => spinning() && requestDraw(), 1000)

    // The photo as a texture (scaled down if larger than this GPU allows)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img
      .decode()
      .then(() => {
        if (disposed) return
        const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
        let source: TexImageSource = img
        if (img.naturalWidth > maxSize) {
          const scaled = document.createElement('canvas')
          scaled.width = maxSize
          scaled.height = Math.round(maxSize / 2)
          scaled.getContext('2d')!.drawImage(img, 0, 0, scaled.width, scaled.height)
          source = scaled
        }
        texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source)
        setStatus('ready')
        requestDraw()
      })
      .catch(() => !disposed && setStatus('error'))

    // Looking around
    const interact = () => {
      lastInteraction = performance.now()
      setTouched(true)
    }
    const zoom = (factor: number) => {
      view.fov = Math.min(FOV.max, Math.max(FOV.min, view.fov * factor))
      interact()
      requestDraw()
    }
    zoomRef.current = zoom

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
      }
      interact()
    }
    const onPointerMove = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId)
      if (!previous) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        const radiansPerPixel = view.fov / canvas.clientHeight
        view.yaw -= (e.clientX - previous.x) * radiansPerPixel
        view.pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, view.pitch + (e.clientY - previous.y) * radiansPerPixel))
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance > 0 && distance > 0) zoom(pinchDistance / distance)
        pinchDistance = distance
      }
      interact()
      requestDraw()
    }
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinchDistance = 0
      interact()
    }
    // Plain scrolling keeps scrolling the page; ctrl+scroll (also a trackpad pinch) zooms
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !document.fullscreenElement && !container.dataset.expanded) return
      e.preventDefault()
      zoom(Math.exp(e.deltaY * 0.002))
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const step = 5 * DEG
      if (e.key === 'ArrowLeft') view.yaw -= step
      else if (e.key === 'ArrowRight') view.yaw += step
      else if (e.key === 'ArrowUp') view.pitch = Math.min(MAX_PITCH, view.pitch + step)
      else if (e.key === 'ArrowDown') view.pitch = Math.max(-MAX_PITCH, view.pitch - step)
      else if (e.key === '+' || e.key === '=') return zoom(0.9)
      else if (e.key === '-') return zoom(1 / 0.9)
      else return
      e.preventDefault()
      interact()
      requestDraw()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('keydown', onKeyDown)

    const resizeObserver = new ResizeObserver(() => requestDraw())
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) requestDraw()
    })
    intersectionObserver.observe(canvas)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.clearInterval(idleTimer)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      container.removeEventListener('keydown', onKeyDown)
      gl.deleteTexture(texture)
      gl.deleteBuffer(quad)
      shaders.forEach((shader) => gl.deleteShader(shader))
      gl.deleteProgram(program)
    }
  }, [src])

  // Escape leaves the expanded view
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const controlClass =
    'flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label={`360° view${hotelName ? ` of ${hotelName}` : ''}${title ? `: ${title}` : ''}. Drag or use the arrow keys to look around.`}
      data-expanded={expanded ? 'true' : undefined}
      className={cn(
        'relative overflow-hidden bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-gold',
        expanded ? 'fixed inset-0 z-[100] rounded-none' : 'aspect-video rounded-xl',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full cursor-grab select-none active:cursor-grabbing',
          // Vertical swipes still scroll the page unless the viewer fills the screen
          expanded ? 'touch-none' : 'touch-pan-y'
        )}
      />

      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
          {status === 'loading' ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <>
              <ImageOff className="h-7 w-7" />
              {status === 'error' ? 'The 360° photo could not be loaded.' : 'This browser cannot show 360° photos.'}
            </>
          )}
        </div>
      )}

      {status === 'ready' && (
        <>
          <span
            className={cn(
              'pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-opacity duration-500',
              touched ? 'opacity-0' : 'opacity-100'
            )}
          >
            <Move className="h-4 w-4" />
            Drag to look around
          </span>

          <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-lg bg-black/45 px-3 py-1.5 text-white backdrop-blur-sm">
            {hotelName && <p className="truncate font-heading text-sm font-semibold leading-snug">{hotelName}</p>}
            <p className={cn('truncate text-xs', hotelName ? 'text-white/80' : 'font-semibold')}>
              360°{title ? ` · ${title}` : ''}
            </p>
          </div>

          {/* A soft shade along the whole bottom edge keeps the credit and buttons readable */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

          {/* Credit on the very bottom edge, under the buttons */}
          <div className="pointer-events-none absolute bottom-1.5 right-3 flex items-center gap-1.5 text-[10px] font-medium leading-none text-white/90 drop-shadow">
            <span>360 Pano</span>
            <span className="text-white/50">|</span>
            <span>Powered by</span>
            <NextImage
              src="/brand/luminexa-logo.webp"
              alt="Luminexa"
              width={711}
              height={96}
              className="h-2.5 w-auto"
            />
          </div>

          <div className="absolute bottom-7 right-3 flex gap-2">
            <button type="button" aria-label="Zoom in" className={controlClass} onClick={() => zoomRef.current(0.8)}>
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Zoom out" className={controlClass} onClick={() => zoomRef.current(1.25)}>
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={expanded ? 'Exit full screen' : 'Full screen'}
              className={controlClass}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
