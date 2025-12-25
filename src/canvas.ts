import * as THREE from "three"
import { Dimensions, Size } from "./types/types"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import GUI from "lil-gui"
import Planes from "./planes"

export default class Canvas {
  element: HTMLCanvasElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  sizes: Size
  dimensions: Dimensions
  time: number
  clock: THREE.Clock
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2 = new THREE.Vector2()
  orbitControls: OrbitControls
  debug: GUI
  planes: Planes
  material: THREE.ShaderMaterial

  constructor() {
    this.element = document.getElementById("webgl") as HTMLCanvasElement
    
    if (!this.element) {
      console.error("Canvas element with id 'webgl' not found!")
      return
    }
    
    this.time = 0
    this.createClock()
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.setSizes()
    this.addEventListeners()
    this.createDebug()
    this.createPlanes()

    this.debug.hide()

    this.render()
  }

  createScene() {
    this.scene = new THREE.Scene()
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.scene.add(this.camera)
    this.camera.position.z = 10
  }

  createHelpers() {
    const axesHelper = new THREE.AxesHelper(5)
    this.scene.add(axesHelper)
  }

  createOrbitControls() {
    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    )
  }

  createPlanes() {
    this.planes = new Planes({ scene: this.scene, sizes: this.sizes })
    // Bind drag interactions to the renderer's canvas
    this.planes.bindDrag(this.renderer.domElement)
  }

  createRenderer() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.element,
      alpha: true,
      antialias: true,
    })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.setClearColor(0x000000, 0) // Transparent background
    this.renderer.render(this.scene, this.camera)

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    
    console.log("Renderer created:", this.dimensions)
  }

  createDebug() {
    this.debug = new GUI()
  }

  setSizes() {
    let fov = this.camera.fov * (Math.PI / 180)
    let height = this.camera.position.z * Math.tan(fov / 2) * 2
    let width = height * this.camera.aspect

    this.sizes = {
      width: width,
      height: height,
    }
  }

  createClock() {
    this.clock = new THREE.Clock()
  }

  onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  addEventListeners() {
    window.addEventListener("mousemove", this.onMouseMove.bind(this))
    window.addEventListener("resize", this.onResize.bind(this))
  }

  onResize() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes()

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
  }

  render() {
    const now = this.clock.getElapsedTime()
    const delta = now - this.time
    this.time = now

    const normalizedDelta = delta / (1 / 60)

    this.planes?.render(normalizedDelta)

    this.renderer.render(this.scene, this.camera)
  }
}
