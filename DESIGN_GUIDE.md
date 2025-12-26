# Card Design Guide

This guide explains how the affirmation cards are designed and how you can customize them.

## Overview

Each card is generated as a canvas image with:
1. **Background** - Black base
2. **Abstract Pattern** - Cyan lines and red dots (circuit-board style)
3. **Text** - White affirmation text with cyan glow

## Key Files

- `src/planes.ts` - Contains all the card generation code
  - `generateAffirmationCards()` - Main function that creates each card
  - `drawAbstractPattern()` - Draws the cyan lines and red dots

## Design Elements Explained

### 1. Card Dimensions
```typescript
const cardWidth = 512   // Width in pixels
const cardHeight = 866  // Height in pixels (aspect ratio ~1:1.69, like a phone)
```
**To change:** Modify these values to make cards wider, taller, or square.

### 2. Background Color
```typescript
ctx.fillStyle = "#000000"  // Black background
ctx.fillRect(0, 0, cardWidth, cardHeight)
```
**To change:** 
- Use any hex color: `"#1a1a1a"` (dark gray), `"#0a0a0a"` (very dark), etc.
- Or use gradients for more interesting backgrounds

### 3. Abstract Pattern (Cyan Lines)

Located in `drawAbstractPattern()` function:

#### Line Color
```typescript
ctx.strokeStyle = "#00ffff"  // Cyan color
```
**To change:** 
- `"#00ffff"` = Cyan (current)
- `"#00ff00"` = Green
- `"#ff00ff"` = Magenta
- `"#ffff00"` = Yellow
- Any hex color works!

#### Line Thickness
```typescript
ctx.lineWidth = 1  // Thin lines
```
**To change:** 
- `1` = Very thin (current)
- `2` = Slightly thicker
- `3` = Medium
- `5+` = Thick lines

#### Number of Lines
```typescript
const numLines = 30 + Math.random() * 20  // 30-50 lines
```
**To change:**
- `10 + Math.random() * 10` = 10-20 lines (sparse)
- `50 + Math.random() * 50` = 50-100 lines (dense)
- `100` = Fixed number (no randomness)

#### Line Length
```typescript
const length = 20 + Math.random() * 60  // 20-80 pixels
```
**To change:**
- `10 + Math.random() * 30` = Shorter lines (10-40px)
- `50 + Math.random() * 100` = Longer lines (50-150px)

#### L-Shapes and Corners
```typescript
if (Math.random() > 0.7) {  // 30% chance to create corner
```
**To change:**
- `> 0.5` = 50% chance (more corners)
- `> 0.9` = 10% chance (fewer corners)
- `> 1.0` = Never (no corners, only straight lines)

### 4. Red Dots

#### Dot Color
```typescript
ctx.fillStyle = "#ff0000"  // Red
```
**To change:** Any hex color

#### Number of Dots
```typescript
const numDots = 5 + Math.random() * 10  // 5-15 dots
```
**To change:** Adjust the range

#### Dot Size
```typescript
const size = 1 + Math.random() * 2  // 1-3 pixels
```
**To change:**
- `2 + Math.random() * 3` = 2-5 pixels (larger)
- `0.5 + Math.random() * 1` = 0.5-1.5 pixels (smaller)

### 5. Text Styling

#### Text Color
```typescript
ctx.fillStyle = "#ffffff"  // White text
```
**To change:** Any hex color

#### Font
```typescript
ctx.font = "bold 26px Arial, sans-serif"
```
**To change:**
- `"bold 30px Arial"` = Larger, bolder
- `"24px 'Times New Roman'"` = Different font
- `"italic 28px Georgia"` = Italic style
- Available fonts: Arial, Helvetica, Times, Georgia, Courier, etc.

#### Text Glow Effect
```typescript
ctx.shadowColor = "rgba(0, 255, 255, 0.5)"  // Cyan glow, 50% opacity
ctx.shadowBlur = 10  // Blur radius
```
**To change:**
- Color: `"rgba(255, 0, 255, 0.8)"` = Magenta glow, 80% opacity
- Blur: `5` = Subtle glow, `20` = Strong glow
- Remove glow: Set `shadowBlur = 0` or remove shadow code

#### Text Positioning
```typescript
const maxWidth = cardWidth - 80  // Text padding from edges
const fontSize = 26
const lineHeight = fontSize + 10  // Space between lines
```
**To change:**
- `cardWidth - 100` = More padding (narrower text)
- `fontSize + 15` = More space between lines

### 6. Card Wrapper (Frame)

The wrapper texture controls the card shape. Located in `createCustomCardWrapper()`:

```typescript
ctx.fillStyle = "rgba(255, 0, 0, 1.0)"  // Red with full alpha
```

**Important:** The shader uses this logic:
- If wrapper's **blue channel < 0.02**: Shows the card (atlas)
- If wrapper's **blue channel >= 0.02**: Shows wrapper design

So use colors with **blue = 0** (like red `#ff0000`, yellow `#ffff00`) to show cards.

## Example Customizations

### Example 1: Green Circuit Board
```typescript
// In drawAbstractPattern():
ctx.strokeStyle = "#00ff00"  // Green lines
ctx.lineWidth = 2  // Thicker lines
const numLines = 50 + Math.random() * 30  // More lines

// Text:
ctx.fillStyle = "#00ff00"  // Green text
ctx.shadowColor = "rgba(0, 255, 0, 0.6)"  // Green glow
```

### Example 2: Purple Theme
```typescript
// Background:
ctx.fillStyle = "#1a0a1a"  // Very dark purple

// Pattern:
ctx.strokeStyle = "#ff00ff"  // Magenta lines

// Text:
ctx.fillStyle = "#ff00ff"  // Magenta text
ctx.shadowColor = "rgba(255, 0, 255, 0.7)"  // Magenta glow
```

### Example 3: Minimalist (Fewer Lines)
```typescript
// In drawAbstractPattern():
const numLines = 10 + Math.random() * 5  // Only 10-15 lines
const numDots = 2 + Math.random() * 3  // Only 2-5 dots
```

## How It All Works Together

1. **Canvas Creation**: Each card starts as a blank canvas (512x866 pixels)
2. **Background**: Black rectangle fills the entire canvas
3. **Pattern**: Cyan lines and red dots are drawn randomly
4. **Text**: Affirmation text is split into lines and drawn centered
5. **Conversion**: Canvas is converted to an Image object
6. **Atlas**: All card images are combined into one large texture (atlas)
7. **Shader**: The 3D shader displays the atlas on floating planes

## Tips for Customization

1. **Start Small**: Change one thing at a time to see the effect
2. **Use Console**: Check browser console for any errors
3. **Test Colors**: Use online color pickers to find hex codes
4. **Balance**: Too many lines = busy, too few = empty
5. **Contrast**: Ensure text is readable against the background
6. **Performance**: More lines/dots = slower generation (but only happens once)

## Advanced: Custom Patterns

You can create completely custom patterns by modifying `drawAbstractPattern()`:

```typescript
// Example: Grid pattern
for (let x = 0; x < width; x += 50) {
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()
}

// Example: Circles
for (let i = 0; i < 20; i++) {
  ctx.beginPath()
  ctx.arc(
    Math.random() * width,
    Math.random() * height,
    10 + Math.random() * 20,
    0, Math.PI * 2
  )
  ctx.stroke()
}
```

Happy designing! 🎨

