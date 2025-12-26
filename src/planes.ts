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
  isHoveringCard: boolean = false
  raycaster?: THREE.Raycaster
  mouse?: THREE.Vector2
  camera?: THREE.Camera

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
    // Match the card aspect ratio: cardHeight / cardWidth = 260 / 220 = 1.182 (portrait - height > width, very compact)
    const cardAspectRatio = 260 / 220
    this.geometry = new THREE.PlaneGeometry(1, cardAspectRatio, 1, 1)
    this.geometry.scale(2, 2, 2)
  }

  async fetchCovers() {
    try {
      console.log("Loading affirmations...")
      // Load affirmations from JSON and generate text cards
      const response = await fetch("/affirmations.json")
      if (!response.ok) {
        throw new Error(`Failed to load affirmations: ${response.status}`)
      }
      const data = await response.json()
      const affirmations = data.affirmations
      console.log("Loaded", affirmations.length, "affirmations")
      
      // Limit to first 10 for faster testing (can increase later)
      const affirmationsToUse = affirmations.slice(0, 10)
      console.log("Using", affirmationsToUse.length, "affirmations for cards")
      
      console.log("Generating cards...")
      const cardImages = await this.generateAffirmationCards(affirmationsToUse)
      console.log("Generated", cardImages.length, "cards")
      
      if (cardImages.length === 0) {
        throw new Error("No cards were generated!")
      }
      
      await this.loadTextureAtlas(cardImages)
      console.log("Atlas loaded, imageInfos:", this.imageInfos.length)
      
      this.createBlurryAtlas()
      console.log("Blurry atlas created")
      
      this.fillMeshData()
      console.log("Mesh data filled")
    } catch (error) {
      console.error("Error in fetchCovers:", error)
    }
  }

  async generateAffirmationCards(affirmations: string[]): Promise<CanvasImageSource[]> {
    // ============================================
    // CARD DIMENSIONS - Change these to resize cards
    // ============================================
    const cardWidth = 220   // Width in pixels (portrait orientation - width < height)
    const cardHeight = 260  // Height in pixels (portrait - EXTREMELY small to ensure ONLY one card fits in 580px viewport)
    const cards: CanvasImageSource[] = []

    // Generate a card for each affirmation
    for (const affirmation of affirmations) {
      const canvas = document.createElement("canvas")
      canvas.width = cardWidth
      canvas.height = cardHeight
      const ctx = canvas.getContext("2d")!

      // ============================================
      // BACKGROUND COLOR - Change this to change card background
      // ============================================
      ctx.fillStyle = "#000000"  // Black - try "#1a1a1a" for dark gray, "#0a0a0a" for very dark
      ctx.fillRect(0, 0, cardWidth, cardHeight)

      // ============================================
      // ABSTRACT PATTERN - Cyan lines and red dots
      // ============================================
      // This draws the circuit-board style pattern
      this.drawAbstractPattern(ctx, cardWidth, cardHeight)

      // ============================================
      // TEXT STYLING - Customize the affirmation text appearance
      // ============================================
      ctx.fillStyle = "#ffffff"  // Text color - try "#00ffff" for cyan, "#ff00ff" for magenta
      ctx.textAlign = "center"   // Center text horizontally
      ctx.textBaseline = "middle" // Center text vertically
      ctx.font = "bold 60px 'Instrument Serif', serif"  // Font: Instrument Serif
      const fontSize = 60

      // Split text into lines that fit the card width - try to keep it to 2-3 lines max
      const words = affirmation.split(" ")
      const lines: string[] = []
      let currentLine = ""
      const maxWidth = cardWidth - 60  // Padding from edges

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)

      // ============================================
      // TEXT GLOW EFFECT - Makes text glow with cyan light
      // ============================================
      ctx.shadowColor = "rgba(0, 255, 255, 0.1)"  // Cyan glow, 50% opacity
      // Try: "rgba(255, 0, 255, 0.8)" for magenta, "rgba(0, 255, 0, 0.6)" for green
      ctx.shadowBlur = 10  // Glow blur radius - try 5 for subtle, 20 for strong glow
      
      // Calculate vertical centering - center all lines as ONE tight block in the middle
      const lineHeight = fontSize + 8  // Tighter spacing between lines
      const totalTextHeight = (lines.length - 1) * lineHeight + fontSize
      const centerY = cardHeight / 2  // Center of card
      const startY = centerY - (totalTextHeight / 2) + (fontSize / 2)  // Start from top of text block
      
      // Draw ONLY the affirmation text, centered as one tight block
      // Use "top" baseline for precise positioning
      ctx.textBaseline = "top"
      lines.forEach((line, i) => {
        ctx.fillText(line, cardWidth / 2, startY + (i * lineHeight))
      })
      ctx.shadowBlur = 0 // Reset shadow for next drawing operations

      // ============================================
      // WHITE BORDER - Add border around the card
      // ============================================
      ctx.strokeStyle = "#ffffff"  // White border color
      ctx.lineWidth = 2  // Border width in pixels
      ctx.strokeRect(0, 0, cardWidth, cardHeight)  // Draw border around entire card

      // Convert to image
      const img = new Image()
      img.src = canvas.toDataURL()
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("Card image loaded:", img.width, "x", img.height)
          resolve(null)
        }
        img.onerror = (e) => {
          console.error("Error loading card image:", e)
          reject(e)
        }
      })
      cards.push(img)
    }

    console.log("All", cards.length, "cards generated successfully")
    return cards
  }

  drawAbstractPattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // ============================================
    // CYAN LINES - Circuit-board style geometric lines
    // ============================================
    
    // Line color - Change this to change line color
    ctx.strokeStyle = "#00ffff"  // Cyan - try "#00ff00" (green), "#ff00ff" (magenta), "#ffff00" (yellow)
    ctx.lineWidth = 1  // Line thickness - try 2 for thicker, 0.5 for thinner
    
    // Number of lines - More lines = busier pattern, fewer = cleaner
    const numLines = 30 + Math.random() * 20  // Creates 30-50 random lines
    // Try: 10 + Math.random() * 10 for sparse (10-20 lines)
    // Try: 50 + Math.random() * 50 for dense (50-100 lines)
    
    for (let i = 0; i < numLines; i++) {
      const x1 = Math.random() * width   // Random starting X position
      const y1 = Math.random() * height  // Random starting Y position
      const isHorizontal = Math.random() > 0.5  // 50% chance horizontal, 50% vertical
      const length = 20 + Math.random() * 60  // Line length: 20-80 pixels
      // Try: 10 + Math.random() * 30 for shorter lines (10-40px)
      // Try: 50 + Math.random() * 100 for longer lines (50-150px)
      
      ctx.beginPath()
      if (isHorizontal) {
        ctx.moveTo(x1, y1)
        ctx.lineTo(x1 + length, y1)
      } else {
        ctx.moveTo(x1, y1)
        ctx.lineTo(x1, y1 + length)
      }
      ctx.stroke()
      
      // ============================================
      // L-SHAPES AND CORNERS - Creates right-angle turns
      // ============================================
      // 30% chance to create a corner (L-shape)
      if (Math.random() > 0.7) {  // Try > 0.5 for more corners (50%), > 0.9 for fewer (10%)
        const cornerLength = 20 + Math.random() * 40  // Corner extension length
        if (isHorizontal) {
          ctx.beginPath()
          ctx.moveTo(x1 + length, y1)
          ctx.lineTo(x1 + length, y1 + (Math.random() > 0.5 ? cornerLength : -cornerLength))
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.moveTo(x1, y1 + length)
          ctx.lineTo(x1 + (Math.random() > 0.5 ? cornerLength : -cornerLength), y1 + length)
          ctx.stroke()
        }
      }
    }

    // ============================================
    // RED DOTS - Small accent dots scattered across card
    // ============================================
    ctx.fillStyle = "#ff0000"  // Dot color - try "#00ff00" (green), "#ff00ff" (magenta)
    const numDots = 5 + Math.random() * 10  // Creates 5-15 random dots
    // Try: 2 + Math.random() * 3 for fewer dots (2-5)
    // Try: 10 + Math.random() * 20 for more dots (10-30)
    
    for (let i = 0; i < numDots; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = 1 + Math.random() * 2  // Dot size: 1-3 pixels
      // Try: 2 + Math.random() * 3 for larger dots (2-5px)
      // Try: 0.5 + Math.random() * 1 for smaller dots (0.5-1.5px)
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  async loadTextureAtlas(images: CanvasImageSource[]) {
    // Images are already CanvasImageSource objects from generateAffirmationCards

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
    
    // Update material uniform
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uAtlas.value = this.atlasTexture
      console.log("Atlas texture assigned to material")
    }
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
    
    // Update material uniform
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uBlurryAtlas.value = this.blurryAtlasTexture
      console.log("Blurry atlas texture assigned to material")
    }
  }

  createCustomCardWrapper(): THREE.Texture {
    // Create a custom card wrapper texture
    // Shader logic: texel.b<0.02 shows atlas (text cards), otherwise shows wrapper design
    // IMPORTANT: The entire area must have blue < 0.02 to show the cards
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 600 // Match card height (reduced from 866)
    const ctx = canvas.getContext("2d")!

    // Fill entire canvas with color where blue < 0.02 (so text cards show through)
    // Red = RGB(255, 0, 0), blue = 0, so shader will show atlas directly
    // Make sure alpha is 1.0 (fully opaque) so shader doesn't discard
    ctx.fillStyle = "rgba(255, 0, 0, 1.0)" // Red with full alpha
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Convert to texture
    const texture = new THREE.Texture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true

    console.log("Wrapper texture created:", canvas.width, "x", canvas.height, "alpha should be 1.0")
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
        uAtlas: { value: null },
        uBlurryAtlas: { value: null },
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

  setHoverDetection(raycaster: THREE.Raycaster, mouse: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster = raycaster
    this.mouse = mouse
    this.camera = camera
  }

  checkHover() {
    if (!this.raycaster || !this.mouse || !this.camera || !this.mesh) {
      this.isHoveringCard = false
      return
    }

    // Update raycaster with current mouse position and camera
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // Check for intersections with the instanced mesh
    const intersects = this.raycaster.intersectObject(this.mesh)

    this.isHoveringCard = intersects.length > 0
  }

  onWheel(event: MouseEvent) {
    const normalizedWheel = normalizeWheel(event)

    let scrollY =
      (normalizedWheel.pixelY * this.sizes.height) / window.innerHeight

    this.scrollY.target += scrollY

    this.material.uniforms.uSpeedY.value += scrollY
  }

  render(delta: number) {
    // Pause all animations when dragging
    if (this.drag.isDown) {
      // Only update drag position, pause everything else
      this.drag.xCurrent +=
        (this.drag.xTarget - this.drag.xCurrent) * this.dragDamping
      this.drag.yCurrent +=
        (this.drag.yTarget - this.drag.yCurrent) * this.dragDamping

      this.material.uniforms.uDrag.value.set(
        this.drag.xCurrent,
        this.drag.yCurrent
      )
      return // Exit early - don't update time, scroll, or speed
    }

    // Normal rendering when not dragging
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

    // Check if hovering over a card to slow down scroll transition
    this.checkHover()
    
    // Use slower interpolation when hovering (0.02 = very slow) vs normal (0.12 = faster)
    const scrollEase = this.isHoveringCard ? 0.02 : 0.12
    
    this.scrollY.current = interpolate(
      this.scrollY.current,
      this.scrollY.target,
      scrollEase
    )

    this.material.uniforms.uScrollY.value = this.scrollY.current

    this.material.uniforms.uSpeedY.value *= 0.835
  }
}

const interpolate = (current: number, target: number, ease: number) => {
  return current + (target - current) * ease
}
