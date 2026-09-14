// yt-clean - Popup Script
// Handles popup UI interactions and settings management

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Clear blocked content button
  document.getElementById('clearBlocked').addEventListener('click', clearBlockedContent);
});

// Load settings from storage
function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['ytCleanSettings'], (result) => {
      const settings = result.ytCleanSettings || {};

      // UI Cleaning
      document.getElementById('hideShorts').checked = settings.hideShorts !== false;
      document.getElementById('hideRecommendations').checked = settings.hideRecommendations !== false;
      document.getElementById('hideLive').checked = settings.hideLive !== false;
      document.getElementById('hideLikeDislike').checked = settings.hideLikeDislike !== false;
      document.getElementById('hideWatermark').checked = settings.hideWatermark !== false;
      document.getElementById('hideComments').checked = settings.hideComments || false;
      document.getElementById('hideYtLogo').checked = settings.hideYtLogo || false;
      document.getElementById('hideNotifications').checked = settings.hideNotifications || false;
      document.getElementById('hideAccount').checked = settings.hideAccount || false;
      document.getElementById('disableInfiniteScroll').checked = settings.disableInfiniteScroll !== false;
      document.getElementById('disableNotInterested').checked = settings.disableNotInterested !== false;

      // Video Player
      document.getElementById('blockAds').checked = settings.blockAds !== false;
      document.getElementById('disableAutoplay').checked = settings.disableAutoplay !== false;
      document.getElementById('hideCards').checked = settings.hideCards !== false;
      document.getElementById('hideEndElements').checked = settings.hideEndElements !== false;
      document.getElementById('increaseVolume').checked = settings.increaseVolume || false;
      document.getElementById('nightMode').checked = settings.nightMode || false;

      // Advanced
      document.getElementById('sleepTimer').value = settings.sleepTimer || 0;
      document.getElementById('theme').value = settings.theme || 'default';
    });
  }
}

// Save settings to storage
function saveSettings() {
  const settings = {
    // UI Cleaning
    hideShorts: document.getElementById('hideShorts').checked,
    hideRecommendations: document.getElementById('hideRecommendations').checked,
    hideLive: document.getElementById('hideLive').checked,
    hideLikeDislike: document.getElementById('hideLikeDislike').checked,
    hideWatermark: document.getElementById('hideWatermark').checked,
    hideComments: document.getElementById('hideComments').checked,
    hideYtLogo: document.getElementById('hideYtLogo').checked,
    hideNotifications: document.getElementById('hideNotifications').checked,
    hideAccount: document.getElementById('hideAccount').checked,
    disableInfiniteScroll: document.getElementById('disableInfiniteScroll').checked,
    disableNotInterested: document.getElementById('disableNotInterested').checked,

    // Video Player
    blockAds: document.getElementById('blockAds').checked,
    disableAutoplay: document.getElementById('disableAutoplay').checked,
    hideCards: document.getElementById('hideCards').checked,
    hideEndElements: document.getElementById('hideEndElements').checked,
    increaseVolume: document.getElementById('increaseVolume').checked,
    nightMode: document.getElementById('nightMode').checked,

    // Advanced
    sleepTimer: parseInt(document.getElementById('sleepTimer').value) || 0,
    theme: document.getElementById('theme').value
  };

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.set({ ytCleanSettings: settings }, () => {
      showStatusMessage('Settings saved successfully!');
      
      // Notify content scripts
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated', settings });
        }
      });
    });
  } else {
    showStatusMessage('Settings saved!');
  }
}

// Clear blocked channels and videos
function clearBlockedContent() {
  if (confirm('Are you sure you want to clear all blocked channels and videos?')) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['ytCleanSettings'], (result) => {
        const settings = result.ytCleanSettings || {};
        settings.blockedChannels = [];
        settings.blockedVideos = [];
        
        chrome.storage.sync.set({ ytCleanSettings: settings }, () => {
          showStatusMessage('Blocked content cleared!');
        });
      });
    }
  }
}

// Show status message
function showStatusMessage(message) {
  const statusEl = document.getElementById('statusMsg');
  statusEl.textContent = message;
  statusEl.classList.add('show');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 2000);
}
