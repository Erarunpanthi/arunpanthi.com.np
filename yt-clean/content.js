// yt-clean - Content Script
// Handles UI modifications, ad blocking, video enhancements, and user interactions

(function() {
  'use strict';

  // State management
  let settings = {
    hideShorts: true,
    hideRecommendations: true,
    hideLive: true,
    blockAds: true,
    autoSkipNonMusic: true,
    disableAutoplay: true,
    hideCards: true,
    hideEndElements: true,
    increaseVolume: false,
    volumeBoost: 1.5,
    sleepTimer: null,
    nightMode: false,
    theme: 'default',
    hideLikeDislike: true,
    hideWatermark: true,
    hideComments: true,
    hideYtLogo: true,
    hideNotifications: true,
    hideAccount: true,
    disableInfiniteScroll: true,
    disableNotInterested: true,
    blockedChannels: [],
    blockedVideos: []
  };

  // Load settings from storage
  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['ytCleanSettings'], (result) => {
        if (result.ytCleanSettings) {
          settings = { ...settings, ...result.ytCleanSettings };
          applyAllSettings();
        } else {
          applyAllSettings();
        }
      });
    } else {
      applyAllSettings();
    }
  }

  // Apply all settings
  function applyAllSettings() {
    applyUIHiding();
    setupAdBlocking();
    setupVideoEnhancements();
    setupSkipCutButton();
    setupMouseWheelVolume();
    setupSleepTimer();
    applyTheme();
  }

  // UI Hiding
  function applyUIHiding() {
    const styleId = 'yt-clean-ui-hiding';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let css = '';

    if (settings.hideShorts) {
      css += `
        ytd-rich-section-renderer[primary-content="Shorts"],
        ytd-reel-shelf-renderer,
        ytd-short-lockup-view-model,
        a[href*="/shorts/"],
        ytd-grid-video-renderer:has(a[href*="/shorts/"]),
        .shortsLockupViewModelHost { display: none !important; }
      `;
    }

    if (settings.hideRecommendations) {
      css += `
        ytd-watch-next-secondary-results-renderer,
        ytd-compact-video-renderer,
        ytd-compact-radio-renderer,
        #related,
        #secondary { display: none !important; }
      `;
    }

    if (settings.hideLive) {
      css += `
        ytd-live-chat-frame,
        #chat-container,
        .ytp-live-badge { display: none !important; }
      `;
    }

    if (settings.hideLikeDislike) {
      css += `
        #segmented-like-button,
        #segmented-dislike-button,
        ytd-menu-renderer:has(#segmented-like-button) { display: none !important; }
      `;
    }

    if (settings.hideWatermark) {
      css += `
        .ytp-watermark-container,
        .ytp-watermark { display: none !important; }
      `;
    }

    if (settings.hideComments) {
      css += `
        #comments,
        ytd-comments { display: none !important; }
      `;
    }

    if (settings.hideYtLogo) {
      css += `
        #logo-icon,
        #logo-container,
        a[href="/"] { visibility: hidden !important; }
      `;
    }

    if (settings.hideNotifications) {
      css += `
        #notification-count-badge,
        ytd-notification-topbar-button-renderer { display: none !important; }
      `;
    }

    if (settings.hideAccount) {
      css += `
        #avatar-btn,
        ytd-topbar-profile-button-renderer { display: none !important; }
      `;
    }

    if (settings.disableInfiniteScroll) {
      css += `
        ytd-continuation-item-renderer { display: none !important; }
      `;
    }

    if (settings.disableNotInterested) {
      css += `
        ytd-menu-service-item-renderer[aria-label*="not interested"],
        button[aria-label*="Don't recommend channel"] { display: none !important; }
      `;
    }

    if (settings.hideCards) {
      css += `
        .ytp-ce-element,
        .ytp-ce-video,
        .ytp-ce-playlist { display: none !important; }
      `;
    }

    if (settings.hideEndElements) {
      css += `
        .ytp-endscreen-element,
        .ytp-suggestion { display: none !important; }
      `;
    }

    styleEl.textContent = css;
  }

  // Ad Blocking
  function setupAdBlocking() {
    if (!settings.blockAds) return;

    // Skip existing ads
    const skipAd = () => {
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-text');
      if (skipBtn) skipBtn.click();
      
      const video = document.querySelector('video');
      if (video && video.duration > 0 && video.currentTime < video.duration) {
        // Try to skip to end of ad
        const adElement = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
        if (adElement && video.duration > 1) {
          video.currentTime = video.duration - 0.1;
        }
      }
    };

    // Observe for ads
    const observer = new MutationObserver((mutations) => {
      const adElement = document.querySelector('.ad-showing, .ytp-ad-player-overlay, .ytp-ad-text');
      if (adElement) {
        skipAd();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also listen for video events
    document.addEventListener('DOMContentLoaded', () => {
      const video = document.querySelector('video');
      if (video) {
        video.addEventListener('play', skipAd);
      }
    });
  }

  // Video Enhancements
  function setupVideoEnhancements() {
    const video = document.querySelector('video');
    if (!video) {
      setTimeout(setupVideoEnhancements, 500);
      return;
    }

    // Disable autoplay
    if (settings.disableAutoplay) {
      video.autoplay = false;
    }

    // Volume boost
    if (settings.increaseVolume) {
      video.volume = Math.min(settings.volumeBoost, 2.0);
    }

    // Night mode
    if (settings.nightMode) {
      video.style.filter = 'brightness(0.7) contrast(1.2) sepia(0.3)';
    } else {
      video.style.filter = '';
    }
  }

  // SkipCut Button
  function setupSkipCutButton() {
    const addSkipButton = () => {
      const video = document.querySelector('video');
      if (!video) return;

      // Check if button already exists
      if (document.getElementById('skipcut-btn')) return;

      const controls = document.querySelector('.ytp-right-controls');
      if (!controls) {
        setTimeout(addSkipButton, 500);
        return;
      }

      const btn = document.createElement('button');
      btn.id = 'skipcut-btn';
      btn.className = 'ytp-button';
      btn.title = 'Open in SkipCut';
      btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      btn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 8px; color: white;';

      btn.addEventListener('click', () => {
        const videoId = getVideoId();
        if (videoId) {
          const url = `https://skipcut.com/?v=${videoId}`;
          window.open(url, '_blank');
        }
      });

      controls.insertBefore(btn, controls.firstChild);
    };

    // Wait for player to load
    setTimeout(addSkipButton, 1000);
    
    // Re-add on page navigation
    const navObserver = new MutationObserver(() => {
      setTimeout(addSkipButton, 500);
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Get current video ID
  function getVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];
    
    const pathMatch = url.match(/\/(?:embed|shorts|live)\/([^?&]+)/);
    if (pathMatch) return pathMatch[1];
    
    return null;
  }

  // Mouse Wheel Volume Control
  function setupMouseWheelVolume() {
    const video = document.querySelector('video');
    if (!video) {
      setTimeout(setupMouseWheelVolume, 500);
      return;
    }

    video.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        video.volume = Math.max(0, Math.min(1, video.volume + delta));
        
        // Show volume indicator
        showVolumeIndicator(video.volume);
      }
    }, { passive: false });
  }

  function showVolumeIndicator(volume) {
    let indicator = document.getElementById('volume-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'volume-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 50px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(indicator);
    }
    
    indicator.textContent = `Volume: ${Math.round(volume * 100)}%`;
    indicator.style.opacity = '1';
    
    clearTimeout(window.volumeIndicatorTimeout);
    window.volumeIndicatorTimeout = setTimeout(() => {
      indicator.style.opacity = '0';
    }, 1000);
  }

  // Sleep Timer
  function setupSleepTimer() {
    if (settings.sleepTimer) {
      clearTimeout(window.sleepTimerTimeout);
      window.sleepTimerTimeout = setTimeout(() => {
        const video = document.querySelector('video');
        if (video) video.pause();
        alert('Sleep timer ended. Video paused.');
      }, settings.sleepTimer * 60 * 1000);
    }
  }

  // Theme Application
  function applyTheme() {
    const themes = {
      default: '',
      dark: 'body { background: #0f0f0f !important; }',
      light: 'body { background: #f9f9f9 !important; }',
      blue: 'body { background: #0a1628 !important; }',
      purple: 'body { background: #1a0a28 !important; }'
    };

    let themeEl = document.getElementById('yt-clean-theme');
    if (!themeEl) {
      themeEl = document.createElement('style');
      themeEl.id = 'yt-clean-theme';
      document.head.appendChild(themeEl);
    }

    themeEl.textContent = themes[settings.theme] || '';
  }

  // Channel/Video Blocking
  function checkBlockedContent() {
    const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer');
    videoElements.forEach(el => {
      const channelLink = el.querySelector('#channel-name a');
      const videoTitle = el.querySelector('#video-title');
      
      if (channelLink) {
        const channelName = channelLink.textContent.trim();
        if (settings.blockedChannels.includes(channelName)) {
          el.style.display = 'none';
        }
      }
      
      if (videoTitle && settings.blockedVideos.includes(videoTitle.textContent.trim())) {
        el.style.display = 'none';
      }
    });
  }

  // Initialize
  function init() {
    loadSettings();
    
    // Listen for setting changes
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.ytCleanSettings) {
          settings = { ...settings, ...changes.ytCleanSettings.newValue };
          applyAllSettings();
        }
      });
    }

    // Handle SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(applyAllSettings, 500);
      }
    }).observe(document, { subtree: true, childList: true });

    // Periodic checks
    setInterval(() => {
      applyUIHiding();
      checkBlockedContent();
    }, 2000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
