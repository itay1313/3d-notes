import * as THREE from "three"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"
import { Size } from "./types/types"
import normalizeWheel from "normalize-wheel"

interface Props {
  scene: THREE.Scene
  sizes: Size
}

interface ImageInfo {
  width: number
  height: number
  aspectRatio: number
  uvs: {
    xStart: number
    xEnd: number
    yStart: number
    yEnd: number
  }
}

export default class Planes {
  scene: THREE.Scene
  geometry: THREE.PlaneGeometry
  material: THREE.ShaderMaterial
  mesh: THREE.InstancedMesh
  meshCount: number = 400
  sizes: Size
  drag: {
    xCurrent: number
    xTarget: number
    yCurrent: number
    yTarget: number
    isDown: boolean
    startX: number
    startY: number
    lastX: number
    lastY: number
  } = {
    xCurrent: 0,
    xTarget: 0,
    yCurrent: 0,
    yTarget: 0,
    isDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  }
  shaderParameters = {
    maxX: 0,
    maxY: 0,
  }
  scrollY: {
    target: number
    current: number
    direction: number
  } = {
    target: 0,
    current: 0,
    direction: 0,
  }
  dragSensitivity: number = 1
  dragDamping: number = 0.1
  dragElement?: HTMLElement
  imageInfos: ImageInfo[] = []
  atlasTexture: THREE.Texture | null = null
  blurryAtlasTexture: THREE.Texture | null = null

  constructor({ scene, sizes }: Props) {
    this.scene = scene
    this.sizes = sizes

    this.shaderParameters = {
      maxX: this.sizes.width * 2,
      maxY: this.sizes.height * 2,
    }

    this.createGeometry()
    this.createMaterial()
    this.createInstancedMesh()
    this.fetchCovers()

    window.addEventListener("wheel", this.onWheel.bind(this))
  }

  createGeometry() {
    this.geometry = new THREE.PlaneGeometry(1, 1.69, 1, 1)
    this.geometry.scale(2, 2, 2)
  }

  async fetchCovers() {
    //const urls: string[] = await get30NewReleaseCovers()
    const urls: string[] = new Array(30)
      .fill(0)
      .map((_, i) => `/covers/image_${i}.jpg`)
    await this.loadTextureAtlas(urls)
    this.createBlurryAtlas()
    this.fillMeshData()
  }

  async loadTextureAtlas(urls: string[]) {
    // Load all images with CORS-safe approach to avoid tainted canvas
    const imagePromises = urls.map(async (path) => {
      try {
        const res = await fetch(path, { mode: "cors" })
        if (!res.ok) throw new Error(`Failed to fetch image: ${path}`)
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        return bitmap as CanvasImageSource
      } catch (err) {
        // Fallback to HTMLImageElement with crossOrigin
        return await new Promise<CanvasImageSource>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => resolve(img)
          img.onerror = (e) => reject(e)
          img.src = path
        })
      }
    })

    const images = await Promise.all(imagePromises)

    // Calculate atlas dimensions (for simplicity, we'll stack images vertically)
    const atlasWidth = Math.max(
      ...images.map((img: any) => img.width as number)
    )
    let totalHeight = 0

    // First pass: calculate total height
    images.forEach((img: any) => {
      totalHeight += img.height as number
    })

    // Create canvas with calculated dimensions
    const canvas = document.createElement("canvas")
    canvas.width = atlasWidth
    canvas.height = totalHeight
    const ctx = canvas.getContext("2d")!

    // Second pass: draw images and calculate normalized coordinates
    let currentY = 0
    this.imageInfos = images.map((img: any) => {
      const aspectRatio = (img.width as number) / (img.height as number)

      // Draw the image
      ctx.drawImage(img as any, 0, currentY)

      // Calculate normalized coordinates

      const info = {
        width: img.width,
        height: img.height,
        aspectRatio,
        uvs: {
          xStart: 0,
          xEnd: (img.width as number) / atlasWidth,
          yStart: 1 - currentY / totalHeight,
          yEnd: 1 - (currentY + (img.height as number)) / totalHeight,
        },
      }

      currentY += img.height as number
      return info
    })

    // Create texture from canvas
    this.atlasTexture = new THREE.Texture(canvas)
    this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping
    this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping
    this.atlasTexture.minFilter = THREE.LinearFilter
    this.atlasTexture.magFilter = THREE.LinearFilter
    this.atlasTexture.needsUpdate = true
    this.material.uniforms.uAtlas.value = this.atlasTexture
  }

  createBlurryAtlas() {
    //create a blurry version of the atlas for far away planes
    if (!this.atlasTexture) return

    const blurryCanvas = document.createElement("canvas")
    blurryCanvas.width = this.atlasTexture.image.width
    blurryCanvas.height = this.atlasTexture.image.height
    const ctx = blurryCanvas.getContext("2d")!
    ctx.filter = "blur(100px)"
    ctx.drawImage(this.atlasTexture.image, 0, 0)
    this.blurryAtlasTexture = new THREE.Texture(blurryCanvas)
    this.blurryAtlasTexture.wrapS = THREE.ClampToEdgeWrapping
    this.blurryAtlasTexture.wrapT = THREE.ClampToEdgeWrapping
    this.blurryAtlasTexture.minFilter = THREE.LinearFilter
    this.blurryAtlasTexture.magFilter = THREE.LinearFilter
    this.blurryAtlasTexture.needsUpdate = true
    this.material.uniforms.uBlurryAtlas.value = this.blurryAtlasTexture
  }

  createCustomCardWrapper(): THREE.Texture {
    // Create a custom card wrapper texture
    // Shader logic: texel.b<0.02 shows atlas (image), otherwise shows wrapper design
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 866 // Aspect ratio 1:1.69 (phone-like)
    const ctx = canvas.getContext("2d")!

    // Fill entire canvas with color where blue < 0.02 (so image shows through)
    // Use RGB where B component is very low (normalized: 0/255 = 0.0)
    ctx.fillStyle = "#ff0000" // Red = RGB(255, 0, 0), blue = 0, so image shows
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Now add card frame design where we want it visible
    // Use colors with blue >= 0.02 for frame areas
    const cornerRadius = 20
    const padding = 10
    const borderWidth = 3
    
    // Draw card border frame (with blue > 0.02 so it shows as design)
    ctx.strokeStyle = "#00ffff" // Cyan = RGB(0, 255, 255), blue = 255, so frame shows
    ctx.lineWidth = borderWidth
    this.roundRect(ctx, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2, cornerRadius)
    ctx.stroke()

    // Add decorative elements at top and bottom (optional)
    // Top decorative bar
    ctx.fillStyle = "#00ffff" // Cyan for visible design
    this.roundRect(ctx, padding + cornerRadius, padding + 15, 
                   canvas.width - (padding + cornerRadius) * 2, 50, 8)
    ctx.fill()

    // Bottom decorative bar
    ctx.fillStyle = "#00ffff" // Cyan for visible design
    this.roundRect(ctx, padding + cornerRadius, canvas.height - padding - 65, 
                   canvas.width - (padding + cornerRadius) * 2, 50, 8)
    ctx.fill()

    // Convert to texture
    const texture = new THREE.Texture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true

    return texture
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  createMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uMaxXdisplacement: {
          value: new THREE.Vector2(
            this.shaderParameters.maxX,
            this.shaderParameters.maxY
          ),
        },
        uWrapperTexture: {
          value: this.createCustomCardWrapper(),
        },
        uAtlas: new THREE.Uniform(this.atlasTexture),
        uBlurryAtlas: new THREE.Uniform(this.blurryAtlasTexture),
        uScrollY: { value: 0 },
        // Calculate total length of the gallery
        uSpeedY: { value: 0 },
        uDrag: { value: new THREE.Vector2(0, 0) },
      },
    })
  }

  createInstancedMesh() {
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.meshCount
    )
    this.scene.add(this.mesh)
  }

  fillMeshData() {
    const initialPosition = new Float32Array(this.meshCount * 3)
    const meshSpeed = new Float32Array(this.meshCount)
    const aTextureCoords = new Float32Array(this.meshCount * 4)

    for (let i = 0; i < this.meshCount; i++) {
      initialPosition[i * 3 + 0] =
        (Math.random() - 0.5) * this.shaderParameters.maxX * 2 // x
      initialPosition[i * 3 + 1] =
        (Math.random() - 0.5) * this.shaderParameters.maxY * 2 // y

      //from -15 to 7

      initialPosition[i * 3 + 2] = Math.random() * (7 - -30) - 30 // z

      meshSpeed[i] = Math.random() * 0.5 + 0.5

      const imageIndex = i % this.imageInfos.length

      aTextureCoords[i * 4 + 0] = this.imageInfos[imageIndex].uvs.xStart
      aTextureCoords[i * 4 + 1] = this.imageInfos[imageIndex].uvs.xEnd
      aTextureCoords[i * 4 + 2] = this.imageInfos[imageIndex].uvs.yStart
      aTextureCoords[i * 4 + 3] = this.imageInfos[imageIndex].uvs.yEnd
    }

    this.geometry.setAttribute(
      "aInitialPosition",
      new THREE.InstancedBufferAttribute(initialPosition, 3)
    )
    this.geometry.setAttribute(
      "aMeshSpeed",
      new THREE.InstancedBufferAttribute(meshSpeed, 1)
    )

    this.mesh.geometry.setAttribute(
      "aTextureCoords",
      new THREE.InstancedBufferAttribute(aTextureCoords, 4)
    )
  }

  bindDrag(element: HTMLElement) {
    this.dragElement = element

    const onPointerDown = (e: PointerEvent) => {
      this.drag.isDown = true
      this.drag.startX = e.clientX
      this.drag.startY = e.clientY
      this.drag.lastX = e.clientX
      this.drag.lastY = e.clientY
      element.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!this.drag.isDown) return
      const dx = e.clientX - this.drag.lastX
      const dy = e.clientY - this.drag.lastY
      this.drag.lastX = e.clientX
      this.drag.lastY = e.clientY

      // Convert pixels to world units proportionally to viewport size
      const worldPerPixelX =
        (this.sizes.width / window.innerWidth) * this.dragSensitivity
      const worldPerPixelY =
        (this.sizes.height / window.innerHeight) * this.dragSensitivity

      this.drag.xTarget += -dx * worldPerPixelX
      this.drag.yTarget += dy * worldPerPixelY
    }

    const onPointerUp = (e: PointerEvent) => {
      this.drag.isDown = false
      try {
        element.releasePointerCapture(e.pointerId)
      } catch {}
    }

    element.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  onWheel(event: MouseEvent) {
    const normalizedWheel = normalizeWheel(event)

    let scrollY =
      (normalizedWheel.pixelY * this.sizes.height) / window.innerHeight

    this.scrollY.target += scrollY

    this.material.uniforms.uSpeedY.value += scrollY
  }

  render(delta: number) {
    this.material.uniforms.uTime.value += delta * 0.015

    // Smoothly interpolate current drag towards target
    this.drag.xCurrent +=
      (this.drag.xTarget - this.drag.xCurrent) * this.dragDamping
    this.drag.yCurrent +=
      (this.drag.yTarget - this.drag.yCurrent) * this.dragDamping

    this.material.uniforms.uDrag.value.set(
      this.drag.xCurrent,
      this.drag.yCurrent
    )

    this.scrollY.current = interpolate(
      this.scrollY.current,
      this.scrollY.target,
      0.12
    )

    this.material.uniforms.uScrollY.value = this.scrollY.current

    this.material.uniforms.uSpeedY.value *= 0.835
  }
}

const interpolate = (current: number, target: number, ease: number) => {
  return current + (target - current) * ease
}
