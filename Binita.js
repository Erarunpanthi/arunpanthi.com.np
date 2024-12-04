// Select all sections to apply restrictions
document.querySelectorAll('.section').forEach((section) => {
    // Disable right-click
    section.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        alert("Right-click is disabled on this section.");
    });

    // Disable text selection
    section.addEventListener('selectstart', (e) => {
        e.preventDefault();
        alert("Text selection is disabled.");
    });

    // Disable copying
    section.addEventListener('copy', (e) => {
        e.preventDefault();
        alert("Copying is disabled on this section.");
    });

    // Disable drag-and-drop
    section.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    // Disable keyboard shortcuts for copying, viewing source, or inspecting
    document.addEventListener('keydown', (e) => {
        if (
            (e.ctrlKey && e.key === 'c') || // Copy
            (e.ctrlKey && e.key === 'u') || // View source
            (e.ctrlKey && e.key === 's') || // Save
            (e.ctrlKey && e.shiftKey && e.key === 'i') || // DevTools
            (e.ctrlKey && e.shiftKey && e.key === 'c') || // Inspect element
            e.key === 'F12' // DevTools
        ) {
            e.preventDefault();
            alert("Keyboard shortcuts are disabled.");
        }
    });
});
