window.addEventListener('DOMContentLoaded', (event) => {
    // Select all elements with class 'cta-button'
    const buttons = document.querySelectorAll('.cta-button');

    buttons.forEach(button => {
        // Find the <a> tag inside the button and hide it
        const link = button.querySelector('a');
        if (link) {
            link.style.display = 'none';  // Hide the <a> tag inside the button
        }
    });
});

