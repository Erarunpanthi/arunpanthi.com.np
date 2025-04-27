document.addEventListener('DOMContentLoaded', function() {
    // Lazy load images and iframes
    const lazyLoad = (targets) => {
        const io = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    
                    if (target.tagName === 'IMG' || target.tagName === 'IFRAME') {
                        // Handle regular lazy loading for images and iframes
                        if (target.dataset.src) {
                            target.src = target.dataset.src;
                            target.removeAttribute('data-src');
                        }
                        if (target.dataset.srcset) {
                            target.srcset = target.dataset.srcset;
                            target.removeAttribute('data-srcset');
                        }
                    } else if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
                        // Handle media elements
                        if (target.dataset.src) {
                            target.src = target.dataset.src;
                            target.removeAttribute('data-src');
                        }
                        if (target.dataset.poster) {
                            target.poster = target.dataset.poster;
                            target.removeAttribute('data-poster');
                        }
                    } else if (target.tagName === 'DIV' && target.dataset.bg) {
                        // Handle background images
                        target.style.backgroundImage = `url(${target.dataset.bg})`;
                        target.removeAttribute('data-bg');
                    }
                    
                    // Add loaded class for transition effects
                    target.classList.add('loaded');
                    
                    // Stop observing
                    observer.unobserve(target);
                }
            });
        }, {
            rootMargin: '200px 0px', // Load slightly before element is in view
            threshold: 0.01
        });

        targets.forEach(target => {
            io.observe(target);
        });
    };

    // Initialize lazy loading for various elements
    const lazyElements = [
        ...document.querySelectorAll('img[data-src], img[data-srcset]'),
        ...document.querySelectorAll('iframe[data-src]'),
        ...document.querySelectorAll('video[data-src], audio[data-src]'),
        ...document.querySelectorAll('[data-bg]')
    ];
    
    lazyLoad(lazyElements);

    // Lazy load components when they become visible
    const lazyComponents = document.querySelectorAll('[data-lazy-component]');
    lazyComponents.forEach(component => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const src = entry.target.dataset.lazyComponent;
                    if (src) {
                        fetchComponent(src, entry.target);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(component);
    });

    // Function to fetch and load components
    function fetchComponent(url, container) {
        fetch(url)
            .then(response => response.text())
            .then(html => {
                container.innerHTML = html;
                container.classList.add('component-loaded');
                
                // Re-initialize lazy loading for any new elements in the component
                const newLazyElements = [
                    ...container.querySelectorAll('img[data-src], img[data-srcset]'),
                    ...container.querySelectorAll('iframe[data-src]'),
                    ...container.querySelectorAll('[data-bg]')
                ];
                
                if (newLazyElements.length > 0) {
                    lazyLoad(newLazyElements);
                }
                
                // Dispatch event for any post-load scripts
                const event = new Event('componentLoaded');
                container.dispatchEvent(event);
            })
            .catch(error => {
                console.error('Error loading component:', error);
            });
    }

    // Lazy load scripts
    const lazyScripts = document.querySelectorAll('script[data-src]');
    lazyScripts.forEach(script => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const newScript = document.createElement('script');
                    newScript.src = entry.target.dataset.src;
                    if (entry.target.dataset.async) {
                        newScript.async = true;
                    }
                    if (entry.target.dataset.defer) {
                        newScript.defer = true;
                    }
                    document.body.appendChild(newScript);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0 });

        observer.observe(script);
    });
});

// Fallback for browsers without IntersectionObserver
if (!('IntersectionObserver' in window)) {
    const lazyLoadFallback = () => {
        const lazyElements = [
            ...document.querySelectorAll('img[data-src], img[data-srcset]'),
            ...document.querySelectorAll('iframe[data-src]'),
            ...document.querySelectorAll('[data-bg]')
        ];
        
        lazyElements.forEach(el => {
            if (isInViewport(el)) {
                if (el.tagName === 'IMG') {
                    if (el.dataset.src) {
                        el.src = el.dataset.src;
                        el.removeAttribute('data-src');
                    }
                    if (el.dataset.srcset) {
                        el.srcset = el.dataset.srcset;
                        el.removeAttribute('data-srcset');
                    }
                } else if (el.tagName === 'IFRAME') {
                    el.src = el.dataset.src;
                    el.removeAttribute('data-src');
                } else if (el.dataset.bg) {
                    el.style.backgroundImage = `url(${el.dataset.bg})`;
                    el.removeAttribute('data-bg');
                }
                el.classList.add('loaded');
            }
        });
    };
    
    const isInViewport = (el) => {
        const rect = el.getBoundingClientRect();
        return (
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.left <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };
    
    window.addEventListener('load', lazyLoadFallback);
    window.addEventListener('scroll', lazyLoadFallback);
    window.addEventListener('resize', lazyLoadFallback);
}
