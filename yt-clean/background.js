// yt-clean - Background Service Worker
// Handles extension lifecycle, context menus, and cross-tab communication

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'skipcut-video',
    title: 'Open in SkipCut',
    contexts: ['link'],
    targetUrlPatterns: ['*://*.youtube.com/watch*']
  });

  chrome.contextMenus.create({
    id: 'block-channel',
    title: 'Block this channel',
    contexts: ['link'],
    targetUrlPatterns: ['*://*.youtube.com/channel/*', '*://*.youtube.com/@*']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'skipcut-video') {
    const url = new URL(info.linkUrl);
    const videoId = url.searchParams.get('v');
    if (videoId) {
      const skipcutUrl = `https://skipcut.com/?v=${videoId}`;
      chrome.tabs.create({ url: skipcutUrl });
    }
  } else if (info.menuItemId === 'block-channel') {
    // Extract channel info and save to blocked list
    chrome.storage.sync.get(['ytCleanSettings'], (result) => {
      const settings = result.ytCleanSettings || { blockedChannels: [] };
      // Parse channel name/ID from URL
      const url = new URL(info.linkUrl);
      const channelId = url.pathname.split('/').pop();
      
      if (!settings.blockedChannels.includes(channelId)) {
        settings.blockedChannels.push(channelId);
        chrome.storage.sync.set({ ytCleanSettings: settings });
        
        // Notify user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Channel Blocked',
          message: `Channel ${channelId} has been blocked.`
        });
      }
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoId') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      const match = url.match(/[?&]v=([^&]+)/);
      sendResponse({ videoId: match ? match[1] : null });
    });
    return true;
  }

  if (request.action === 'openSkipCut') {
    chrome.tabs.create({ url: `https://skipcut.com/?v=${request.videoId}` });
    sendResponse({ success: true });
    return true;
  }
});

// Keep service worker alive for background operations
setInterval(() => {
  // Placeholder to keep worker active
}, 20000);
