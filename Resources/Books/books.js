(() => {
    'use strict';

    // Add books here using a Google Drive file ID, not pasted iframe HTML.
    // Preview URLs are constructed automatically. This is not access control:
    // disable download/print/copy for viewers in the Drive file's Share settings.
    const books = [
        { title: 'Engineering Drawing', fileId: '1U_itdLrTr-4jDDdOUDdKYWlHG_1rm-II' }
    ];
    const container = document.getElementById('book-viewers');
    if (!container) return;

    books.forEach((book) => {
        if (!/^[\w-]+$/.test(book.fileId)) return;
        const article = document.createElement('article');
        article.className = 'book-reader';
        const heading = document.createElement('h3');
        heading.textContent = book.title;
        const frame = document.createElement('iframe');
        frame.title = `${book.title} — book preview`;
        frame.src = `https://drive.google.com/file/d/${encodeURIComponent(book.fileId)}/preview`;
        // Do not grant downloads, popups, or top-level navigation to the embed.
        // Drive's own sharing policy must enforce document permissions.
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        frame.referrerPolicy = 'no-referrer';
        article.append(heading, frame);
        container.append(article);
    });
})();
