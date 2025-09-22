# Web Accessibility Toolbar

A comprehensive accessibility toolbar that provides various accessibility features for websites.

## Features

### Visual Assistance
- **Zoom In/Out**: Adjust page zoom level (0.5x - 3x)
- **High Contrast**: High contrast mode for improved readability
- **Text Only**: Hide images and decorative elements, focus on text content
- **Large Cursor**: Enlarge mouse cursor for better visibility
- **Guide Lines**: Horizontal/vertical guide lines that follow the mouse
- **Large Tooltip**: Show large font tooltips on mouse hover

### Audio Assistance
- **Point Reading**: Click elements for voice reading
- **Continuous Reading**: Read entire page content continuously
- **Volume Control**: Draggable slider to adjust reading volume (0-100%)
- **Speed Control**: Draggable slider to adjust reading speed (0.5x-2x)

### Navigation Functions
- **Home**: Quick return to website homepage
- **Reset**: Restore all settings to default
- **Help**: Voice playback of usage instructions
- **Close**: Hide the toolbar

## Usage

### Basic Operations
1. The toolbar automatically appears at the top when the page loads
2. Click any function button to enable the corresponding feature
3. Selected features will show a red background
4. Click the "Close" button to hide the toolbar

### Keyboard Shortcuts
- `Alt + A`: Show/hide toolbar
- `Alt + =`: Zoom in page
- `Alt + -`: Zoom out page
- `Alt + 0`: Reset zoom
- `Alt + S`: Toggle voice reading
- `Alt + C`: Toggle high contrast
- `Escape`: Stop voice reading

### Volume and Speed Control
1. Click the "Volume" button to show volume slider
2. Click the "Speed" button to show speed slider
3. Drag the slider to adjust values
4. Click elsewhere to close the slider

## Technical Implementation

### File Structure
```
web-accessibility/
├── index.html              # Main page with toolbar UI
├── accessibilityplugin.js  # Core accessibility plugin
├── webtoolbar.js          # Toolbar functionality
├── webtoolbar.css         # Toolbar styles
├── svg/                   # Toolbar icons (SVG format)
├── png/                   # Toolbar icons (PNG format)
└── README.md             # Documentation
```

### Core Features
- **AccessibilityPlugin Class**: Provides complete accessibility functionality API
- **State Management**: Automatically saves and restores user settings
- **Event Binding**: Supports mouse and keyboard operations
- **Speech Synthesis**: Based on Web Speech API
- **Responsive Design**: Adapts to different screen sizes

### Custom Configuration
```javascript
const accessibilityPlugin = new AccessibilityPlugin({
  callbacks: {
    onFeatureToggle: (data) => {
      // Feature toggle callback
    },
    onZoomChange: (data) => {
      // Zoom change callback
    }
  },
  hotkeys: {
    toggleToolbar: 'Alt+KeyA',
    zoomIn: 'Alt+Equal',
    // More hotkey configurations...
  }
});
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 14+
- Edge 79+

## Important Notes

1. Voice features require browser support for Web Speech API
2. Some features require HTTPS environment to work properly
3. Recommended for use in modern browsers that support ES6

## Getting Started

### Method 1: Open HTML file directly
```bash
# Open directly in browser
file:///path/to/index.html
```

### Method 2: Use HTTP server
```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then visit http://localhost:8080

## Implementation Details

### Accessibility Features
- **Screen Reader Support**: Compatible with popular screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **ARIA Labels**: Proper ARIA attributes for assistive technologies
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Accessibility**: Meets WCAG color contrast requirements

### Performance Optimization
- **Lazy Loading**: Icons and resources loaded on demand
- **Efficient Event Handling**: Optimized event listeners
- **Memory Management**: Proper cleanup of resources
- **Minimal Impact**: Lightweight implementation with minimal page performance impact

### Customization Options
- **Theme Support**: Easy integration with existing website themes
- **Icon Customization**: Replace default icons with custom ones
- **Language Support**: Extensible for multiple languages
- **Feature Selection**: Enable/disable specific features as needed

## API Reference

### Main Methods
```javascript
// Initialize the accessibility toolbar
const toolbar = new AccessibilityToolbar(options);

// Toggle specific features
toolbar.toggleZoom();
toolbar.toggleHighContrast();
toolbar.toggleTextOnly();

// Control voice features
toolbar.startReading(text);
toolbar.stopReading();
toolbar.setVolume(volume);
toolbar.setSpeed(speed);

// Reset all features
toolbar.reset();
```

### Event Listeners
```javascript
// Listen for feature changes
toolbar.on('featureChange', (feature, enabled) => {
  console.log(`${feature} is now ${enabled ? 'enabled' : 'disabled'}`);
});

// Listen for zoom changes
toolbar.on('zoomChange', (zoomLevel) => {
  console.log(`Zoom level changed to ${zoomLevel}`);
});
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License

## Support

For support, please open an issue on the GitHub repository or contact the development team.

## Acknowledgments

- Web Speech API for voice synthesis
- WCAG guidelines for accessibility standards
- Community feedback for feature improvements