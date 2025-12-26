# 3D Notes - Affirmations

An immersive 3D web experience featuring affirmation cards floating through space. Built with Three.js, WebGL, and custom shaders for smooth, interactive 3D rendering.

![3D Notes](https://img.shields.io/badge/Three.js-3D%20WebGL-black?style=flat-square&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

## ✨ Features

- **3D Card Gallery**: Navigate through hundreds of affirmation cards in 3D space
- **Interactive Controls**:
  - Smooth scrolling with wheel support
  - Drag to pan around the scene
  - Hover detection for enhanced interactions
- **Performance Optimized**: Uses `InstancedMesh` to render 400+ cards efficiently at 60fps
- **Custom Shaders**: GLSL shaders for advanced visual effects and smooth transitions
- **Dynamic Card Generation**: Cards are generated on-the-fly using Canvas API with:
  - Rounded corners with box shadows
  - Circuit-board aesthetic (cyan lines, red dots)
  - Custom typography with glow effects
- **Responsive Design**: Adapts to different screen sizes and viewports

## 🛠️ Tech Stack

- **Three.js** - 3D graphics library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **WebGL** - Low-level 3D rendering
- **GLSL** - Custom shaders for visual effects
- **Tailwind CSS** - Utility-first CSS framework
- **Canvas API** - Dynamic card generation

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd 3d-notes
```

1. Install dependencies:

```bash
npm install
```

1. Start the development server:

```bash
npm run dev
```

1. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```text
3d-notes/
├── src/
│   ├── canvas.ts          # Main canvas setup and rendering loop
│   ├── planes.ts          # 3D card generation and instanced mesh logic
│   ├── main.ts            # Application entry point
│   ├── shaders/
│   │   ├── vertex.glsl    # Vertex shader for 3D transformations
│   │   └── fragment.glsl  # Fragment shader for rendering effects
│   ├── types/
│   │   └── types.ts       # TypeScript type definitions
│   └── style.css          # Global styles
├── public/
│   ├── affirmations.json  # Affirmation data
│   └── Aeonik TRIAL/      # Custom font files
├── index.html
├── package.json
└── vite.config.js
```

## 🎮 Usage

### Navigation

- **Scroll**: Use mouse wheel to navigate through cards vertically
- **Drag**: Click and drag to pan around the 3D space
- **Hover**: Hover over cards to see smooth scroll transitions

### Customization

The project includes a `DESIGN_GUIDE.md` with detailed instructions on customizing:

- Card dimensions
- Background colors
- Abstract pattern (lines and dots)
- Text styling and fonts
- Border radius and shadows

## 🎨 Design

Each affirmation card features:

- Black background with cyan circuit-board pattern
- White text with cyan glow effect
- Rounded corners (8px border radius)
- Layered blue and white box shadows
- Dynamic text wrapping for optimal readability

## 🔧 Technical Details

### Performance Optimizations

- **InstancedMesh**: Renders 400+ cards using a single draw call
- **Texture Atlas**: All cards combined into one texture for efficient rendering
- **Shader-based Effects**: Visual effects handled in GPU for maximum performance
- **Smooth Interpolation**: Custom easing functions for fluid animations

### Key Components

- **Planes Class**: Manages card generation, texture atlas creation, and mesh instancing
- **Canvas Class**: Handles Three.js scene setup, camera, and rendering loop
- **Custom Shaders**: Vertex and fragment shaders for 3D transformations and visual effects

## 📝 Affirmations

The project includes 102 empowering affirmations focused on strength, resilience, and personal growth. Affirmations are stored in `public/affirmations.json` and can be easily customized.

## 🙏 Credits

This project was inspired by and built upon the excellent work from:

**[Spotify Visualizer](https://github.com/J0SUKE/spotify-visualiser)** by [J0SUKE](https://github.com/J0SUKE)

The 3D rendering architecture, shader implementation, and instanced mesh approach were inspired by this project. Special thanks for the creative and technical inspiration!

## 👤 Author

### Itay Haephrati

A creative developer passionate about building immersive web experiences with cutting-edge technologies.

- 🌐 Website: [itaycode.com](https://itaycode.com)
- 💼 Portfolio: [itaycode.com](https://itaycode.com)

Feel free to reach out or check out more of my work!

## 📄 License

This project is private and not licensed for public use.

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

---

Built with ❤️ using Three.js and WebGL
