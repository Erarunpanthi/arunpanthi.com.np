// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    alert("Right-click is disabled on this page.");
});

// Disable text selection
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    
});

// Disable copying
document.addEventListener('copy', function(e) {
    e.preventDefault();
    alert("Copying is disabled on this page.");
});

// Disable drag-and-drop
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    alert("Drag-and-drop is disabled on this page.");
});

// Block specific key combinations
document.addEventListener('keydown', function(e) {
    // Block Ctrl + P (Print)
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        alert("Printing is disabled on this page.");
    }

    // Block Ctrl + Shift + I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'i') {
        e.preventDefault();
        alert("Developer tools are disabled on this page.");
    }

    // Block Ctrl + U (View source)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        alert("Viewing source is disabled on this page.");
    }

    // Block Ctrl + S (Save)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        alert("Saving the page is disabled.");
    }

    // Block F12 (Developer tools)
    if (e.key === 'F12') {
        e.preventDefault();
        alert("Developer tools are disabled on this page.");
    }

    // Block PrintScreen (Screenshot)
    if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert("Screenshots are disabled.");
    }

    // Block Windows + Shift + S (Windows Screenshot tool)
    if (e.key === 's' && e.shiftKey && e.metaKey) {  // metaKey represents the Windows key
        e.preventDefault();
        alert("Windows screenshot tool is disabled.");
    }

    // Block other screenshot methods like Snipping Tool or Snip & Sketch on Windows
    if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert("Screenshots are disabled on this page.");
    }
});

// Detect and warn when the window loses focus (possible screenshot attempt)
let isBlurred = false;
window.addEventListener('focus', () => {
    if (isBlurred) {
        alert("Screenshots may have been taken! Content is protected.");
        isBlurred = true;
    }
});
window.addEventListener('blur', () => {
    isBlurred = true;
});

// Disable the browser's "inspect element" feature
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'i') {
        e.preventDefault();
        alert("Inspect Element is disabled.");
    }
});

// Prevent the right-click and prevent drag and drop on specific sections or the entire document
document.querySelectorAll('body').forEach(function(element) {
    element.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
});
