(() => {
    'use strict';

    // Add books using a supported provider and document ID, not pasted iframe HTML.
    // Each provider, not this script, controls document access and permissions.
    const books = [
        {
            title: 'Engineering Drawing',
            description: 'Engineering Drawing reference book for civil engineering study and exam preparation.',
            provider: 'drive',
            fileId: '1U_itdLrTr-4jDDdOUDdKYWlHG_1rm-II'
        },
        {
            title: 'Soil Mechanics',
            description: 'Soil Mechanics by Ram Krishna Poudel and Ramesh Neupane. Preview provided by Scribd; access may be limited.',
            provider: 'scribd',
            fileId: '735366439'
        }
    ];
    const cards = document.getElementById('book-cards');
    const container = document.getElementById('book-viewers');
    if (!cards || !container) return;
    let activeButton;

    function closeReader() {
        container.replaceChildren();
        if (activeButton) activeButton.setAttribute('aria-expanded', 'false');
    }

    books.forEach((book) => {
        if (!/^[\w-]+$/.test(book.fileId)) return;
        const previewUrl = book.provider === 'drive'
            ? `https://drive.google.com/file/d/${encodeURIComponent(book.fileId)}/preview`
            : book.provider === 'scribd' && /^\d+$/.test(book.fileId)
                ? `https://www.scribd.com/embeds/${book.fileId}/content`
                : null;
        if (!previewUrl) return;
        const card = document.createElement('article');
        card.className = 'topic-card available';
        const top = document.createElement('div');
        top.className = 'topic-top';
        const label = document.createElement('span');
        label.className = 'topic-number';
        label.textContent = 'Book';
        top.append(label);
        const title = document.createElement('h3');
        title.textContent = book.title;
        const description = document.createElement('p');
        description.textContent = book.description;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'notes-button';
        button.textContent = 'View book →';
        button.setAttribute('aria-label', `View ${book.title} preview`);
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'book-viewers');
        button.addEventListener('click', () => {
            closeReader();
            activeButton = button;
            button.setAttribute('aria-expanded', 'true');
            const article = document.createElement('article');
            article.className = 'book-reader';
            const heading = document.createElement('h3');
            heading.textContent = book.title;
            heading.tabIndex = -1;
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'notes-button book-close';
            close.textContent = 'Close preview';
            close.addEventListener('click', () => {
                closeReader();
                button.focus();
            });
            const frame = document.createElement('iframe');
            frame.title = `${book.title} — book preview`;
            frame.src = previewUrl;
            // Do not grant downloads, popups, or top-level navigation.
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            frame.referrerPolicy = 'no-referrer';
            article.append(heading, close, frame);
            container.append(article);
            heading.focus({ preventScroll: true });
            article.scrollIntoView({ block: 'start' });
        });
        card.append(top, title, description, button);
        cards.append(card);
    });
})();
