(() => {
    'use strict';

    // Keep external documents on the provider's viewer; access is controlled by the host.
    const solutions = {
        'cem-manual': {
            title: 'CEM Manual',
            previewUrl: 'https://cavestudy.com/wp-content/plugins/pdfjs-viewer-shortcode/pdfjs/web/viewer.php?file=https://cavestudy.com/wp-content/uploads/2023/09/CEM-Manual.pdf&attachment_id=6051&dButton=false&pButton=false&oButton=false&sButton=true&editButtons=true&v=3.1.1&_wpnonce=5ed6669b25#zoom=auto&pagemode=none'
        },
        'project-management': {
            title: 'Project Management',
            previewUrl: 'https://www.scribd.com/embeds/833011830/content'
        },
        'applied-mechanics': {
            title: 'Applied Mechanics',
            previewUrl: 'https://www.scribd.com/embeds/576368302/content'
        }
    };
    const container = document.getElementById('solution-viewers');
    if (!container) return;
    const buttons = [...document.querySelectorAll('button[data-solution]')];

    function closeReader() {
        container.replaceChildren();
        buttons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    }

    buttons.forEach((button) => {
        const solution = solutions[button.dataset.solution];
        if (!solution) return;
        button.addEventListener('click', () => {
            closeReader();
            buttons.forEach((control) => {
                control.setAttribute('aria-expanded', String(control.dataset.solution === button.dataset.solution));
            });
            const article = document.createElement('article');
            article.className = 'solution-reader';
            const heading = document.createElement('h3');
            heading.textContent = solution.title;
            heading.tabIndex = -1;
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'notes-button solution-close';
            close.textContent = 'Close preview';
            close.addEventListener('click', () => {
                closeReader();
                button.focus();
            });
            const frame = document.createElement('iframe');
            frame.title = `${solution.title} — PDF preview`;
            frame.src = solution.previewUrl;
            // Allow embedded readers to run without granting downloads, popups, or top-level navigation.
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            frame.referrerPolicy = 'no-referrer';
            article.append(heading, close, frame);
            container.append(article);
            heading.focus({ preventScroll: true });
            article.scrollIntoView({ block: 'start' });
        });
    });
})();
