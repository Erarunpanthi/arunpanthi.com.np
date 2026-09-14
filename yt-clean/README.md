# yt-clean - YouTube Cleaner Extension

A professional Chrome extension that cleans up your YouTube experience by hiding unwanted elements, blocking ads, and enhancing video playback.

## Features

### 🧹 UI Cleaning
- **Hide Shorts** - Remove YouTube Shorts from your feed
- **Hide Recommendations** - Clean up the sidebar recommendations
- **Hide Live Chat** - Remove live chat overlay
- **Hide Like/Dislike** - Remove like/dislike buttons
- **Hide Watermark** - Remove YouTube watermark from videos
- **Hide Comments** - Optionally hide comment section
- **Hide YouTube Logo** - Clean header area
- **Hide Notifications** - Remove notification bell
- **Hide Account Section** - Hide profile/account button
- **Disable Infinite Scroll** - Stop endless content loading
- **Disable "Not Interested"** - Remove recommendation controls

### 🎥 Video Player Enhancements
- **Block Ads** - Automatically skip video ads, banner ads, and popup ads
- **Disable Autoplay** - Prevent videos from auto-playing
- **Hide Cards** - Remove annotation cards
- **Hide End Elements** - Clean up end screen suggestions
- **Increase Volume** - Boost audio volume beyond 100%
- **Mouse Wheel Volume Control** - Adjust volume with Ctrl+Scroll
- **Night Mode** - Reduce brightness for comfortable viewing
- **SkipCut Integration** - Quick access to skipcut.com for enhanced skipping

### ⚙️ Advanced Features
- **Sleep Timer** - Auto-pause after specified minutes
- **Multiple Themes** - Choose from Default, Dark, Light, Blue, or Purple themes
- **Channel Blocking** - Block specific channels from appearing
- **Video Blocking** - Hide specific videos
- **Quality Adjustment** - Enhanced video quality controls
- **Brightness Control** - Adjust video brightness

### 🚫 Content Blocking
- Block unwanted channels
- Hide specific videos
- Filter non-music self-promotion
- Skip unwanted talk segments

## Installation

### Manual Installation (Developer Mode)

1. **Download the Extension**
   - Clone or download this repository
   - Or download as ZIP and extract

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `yt-clean` folder
   - Extension icon should appear in toolbar

4. **Configure Settings**
   - Click the extension icon
   - Toggle features on/off as needed
   - Click "Save Settings"

### Usage

- **Extension Icon**: Click to access settings popup
- **SkipCut Button**: Appears in video player controls (play icon)
- **Volume Control**: Hold Ctrl + scroll mouse wheel over video
- **Context Menu**: Right-click on YouTube links for quick actions

## File Structure

```
yt-clean/
├── manifest.json      # Extension configuration
├── background.js      # Service worker for background tasks
├── content.js         # Main functionality script
├── popup.html         # Settings popup interface
├── popup.js          # Popup logic
├── styles.css        # Custom styles
├── icons/
│   ├── icon16.png    # 16x16 icon
│   ├── icon48.png    # 48x48 icon
│   └── icon128.png   # 128x128 icon
└── README.md         # This file
```

## Permissions Explained

- **storage**: Save your preferences
- **tabs**: Open SkipCut in new tabs
- **scripting**: Inject code into YouTube pages
- **contextMenus**: Add right-click menu options
- **host_permissions**: Access YouTube and SkipCut domains

## Customization

### Adding Custom Themes
Edit `content.js` and add to the `themes` object:
```javascript
const themes = {
  // ... existing themes
  custom: 'body { background: #yourcolor !important; }'
};
```

### Modifying CSS Selectors
Update `styles.css` and `content.js` to target new YouTube elements as they change.

## Troubleshooting

### Extension Not Working
1. Refresh YouTube page (F5)
2. Check if extension is enabled in `chrome://extensions/`
3. Reload extension from extensions page

### Settings Not Saving
1. Ensure you click "Save Settings" button
2. Check browser console for errors (F12)
3. Try clearing browser cache

### YouTube Updates Break Features
YouTube frequently updates their interface. If something stops working:
1. Check browser console for element selector errors
2. Update CSS selectors in `content.js`
3. Reload extension

## Developer Information

**Created by**: Arun Panthi  
**Website**: https://arunpanthi.com.np/aboutus  
**License**: MIT License  

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## Disclaimer

This extension is provided as-is for educational purposes. YouTube is a trademark of Google LLC. This extension is not affiliated with or endorsed by Google or YouTube.

Some features may violate YouTube's Terms of Service. Use at your own discretion.

## Version History

### v1.0.0
- Initial release
- All core features implemented
- SkipCut integration
- Multiple themes
- Channel/video blocking
- Sleep timer
- Volume boost and controls

## Support

For issues, questions, or suggestions:
- Visit: https://arunpanthi.com.np/aboutus
- Open an issue on GitHub

---

**Enjoy a cleaner YouTube experience! 🎬✨**
