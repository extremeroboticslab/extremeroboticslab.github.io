// 1. Initialize Lenis Smooth Scroll
let lenis = null;
if (window.Lenis) {
    lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        smoothTouch: true,
        wheelMultiplier: 0.8,
        touchMultiplier: 1.5,
        lerp: 0.08,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
} else {
    lenis = {
        scrollTo: (value) => {
            window.scrollTo({ top: value, behavior: 'smooth' });
        },
        on: () => {},
        scroll: window.scrollY,
    };
}

let backToTopBtn = null;
let backToTopBound = false;
let autoVideoObserver = null;
let carouselAutoTimer = null;

function updateBackToTop(scrollPos) {
    if (!backToTopBtn) return;
    const y = typeof scrollPos === 'number' ? scrollPos : window.scrollY;
    if (y > 500) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
}

function initBackToTop() {
    backToTopBtn = document.querySelector('.back-to-top');
    if (!backToTopBound) {
        window.addEventListener('scroll', () => {
            updateBackToTop();
        });
        if (lenis && typeof lenis.on === 'function') {
            lenis.on('scroll', ({ scroll }) => updateBackToTop(scroll));
        }
        backToTopBound = true;
    }

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            lenis.scrollTo(0);
        });
    }
    updateBackToTop(lenis && typeof lenis.scroll === 'number' ? lenis.scroll : undefined);
}

function initMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    navLinks.classList.remove('nav-active');
    document.body.classList.remove('nav-open');
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
    }

    if (document.body.dataset.navListeners) return;
    document.addEventListener('click', (event) => {
        const isMobile = window.innerWidth <= 1024;
        const toggle = event.target.closest('.hamburger');
        if (toggle) {
            const menu = document.querySelector('.nav-links');
            if (!menu) return;
            const isOpen = menu.classList.toggle('nav-active');
            document.body.classList.toggle('nav-open', isOpen);
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            return;
        }

        if (!isMobile) return;

        const submenuTrigger = event.target.closest('.nav-item.has-submenu > a');
        if (submenuTrigger) {
            event.preventDefault();
            const item = submenuTrigger.closest('.nav-item');
            if (item) item.classList.toggle('open');
            return;
        }

        const navLink = event.target.closest('.nav-links a');
        if (navLink) {
            const menu = document.querySelector('.nav-links');
            if (menu) menu.classList.remove('nav-active');
            document.body.classList.remove('nav-open');
            const button = document.querySelector('.hamburger');
            if (button) button.setAttribute('aria-expanded', 'false');
            document.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
        }
    });
    document.body.dataset.navListeners = 'true';
}

function initAutoVideos() {
    if (autoVideoObserver) {
        autoVideoObserver.disconnect();
        autoVideoObserver = null;
    }
    const autoVideos = document.querySelectorAll('.autoplay-onview');
    if (autoVideos.length === 0 || !('IntersectionObserver' in window)) return;
    autoVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            const start = parseFloat(video.dataset.start || '');
            if (entry.isIntersecting) {
                if (!Number.isNaN(start) && video.currentTime < start - 0.1) {
                    video.currentTime = start;
                }
                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.5 });

    autoVideos.forEach((video) => {
        const start = parseFloat(video.dataset.start || '');
        if (!Number.isNaN(start)) {
            const ensureStart = () => {
                if (video.currentTime < start - 0.1) {
                    video.currentTime = start;
                }
            };
            video.addEventListener('loadedmetadata', ensureStart);
            video.addEventListener('loadeddata', ensureStart);
            video.addEventListener('play', ensureStart);
            video.addEventListener('timeupdate', ensureStart);
        }
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        autoVideoObserver.observe(video);
    });
}

function initLazyImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    if (lazyImages.length === 0) return;

    const loadImage = (img) => {
        const src = img.dataset.src;
        if (!src) return;
        img.src = src;
        img.removeAttribute('data-src');
    };

    if (!('IntersectionObserver' in window)) {
        lazyImages.forEach((img) => loadImage(img));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            loadImage(img);
            obs.unobserve(img);
        });
    }, { rootMargin: '200px 0px', threshold: 0.1 });

    lazyImages.forEach((img) => observer.observe(img));
}

function initProjectVideos() {
    const projectVideos = document.querySelectorAll('.project-video');
    if (projectVideos.length === 0) return;
    projectVideos.forEach((video) => {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.load();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    });
}

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const dots = document.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    let currentSlide = 0;
    let activeVideo = null;

    if (carouselAutoTimer) {
        clearInterval(carouselAutoTimer);
        carouselAutoTimer = null;
    }

    function clearSlideClasses(slide) {
        slide.classList.remove('active', 'exit-left', 'exit-right', 'enter-left', 'enter-right');
    }

    function pauseAllVideos() {
        slides.forEach((slide) => {
            const video = slide.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        });
    }

    function playActiveVideo(index) {
        activeVideo = slides[index]?.querySelector('video') || null;
        if (activeVideo) {
            const playPromise = activeVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        }
    }

    function showSlide(index, direction) {
        const prevSlide = slides[currentSlide];
        const nextSlide = slides[index];

        slides.forEach((slide) => {
            if (slide !== prevSlide && slide !== nextSlide) {
                clearSlideClasses(slide);
            }
        });

        if (prevSlide && prevSlide !== nextSlide) {
            prevSlide.classList.remove('active');
            prevSlide.classList.add(direction === 'prev' ? 'exit-right' : 'exit-left');
            setTimeout(() => {
                prevSlide.classList.remove('exit-left', 'exit-right');
            }, 650);
        }

        if (nextSlide) {
            clearSlideClasses(nextSlide);
            nextSlide.classList.add(direction === 'prev' ? 'enter-left' : 'enter-right');
            requestAnimationFrame(() => {
                nextSlide.classList.add('active');
                nextSlide.classList.remove('enter-left', 'enter-right');
            });
        }

        pauseAllVideos();
        playActiveVideo(index);
        currentSlide = index;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
            dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
    }

    function startAutoLoop() {
        if (carouselAutoTimer) clearInterval(carouselAutoTimer);
        carouselAutoTimer = setInterval(() => {
            const currentIsVideo = !!slides[currentSlide]?.querySelector('video');
            if (currentIsVideo) return;
            const nextIndex = (currentSlide < slides.length - 1) ? currentSlide + 1 : 0;
            showSlide(nextIndex, 'next');
        }, 5000);
    }

    showSlide(currentSlide, 'next');
    startAutoLoop();

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            const nextIndex = (currentSlide > 0) ? currentSlide - 1 : slides.length - 1;
            showSlide(nextIndex, 'prev');
            startAutoLoop();
        });
        nextBtn.addEventListener('click', () => {
            const nextIndex = (currentSlide < slides.length - 1) ? currentSlide + 1 : 0;
            showSlide(nextIndex, 'next');
            startAutoLoop();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (index === currentSlide) return;
            const direction = index < currentSlide ? 'prev' : 'next';
            showSlide(index, direction);
            startAutoLoop();
        });
    });

    slides.forEach((slide, index) => {
        const video = slide.querySelector('video');
        if (!video) return;
        video.addEventListener('ended', () => {
            if (index !== currentSlide) return;
            const nextIndex = (currentSlide < slides.length - 1) ? currentSlide + 1 : 0;
            showSlide(nextIndex, 'next');
            startAutoLoop();
        });
    });
}

let lightboxOverlay = null;

function ensureLightbox() {
    if (lightboxOverlay) return lightboxOverlay;
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'lightbox-overlay';
    lightboxOverlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">x</button><div class="lightbox-content"></div>';
    document.body.appendChild(lightboxOverlay);
    return lightboxOverlay;
}

function openLightboxFromMedia(media) {
    const overlay = ensureLightbox();
    const content = overlay.querySelector('.lightbox-content');
    if (!content) return;
    content.innerHTML = '';

    if (media.tagName.toLowerCase() === 'img') {
        const img = document.createElement('img');
        img.src = media.getAttribute('src');
        img.alt = media.getAttribute('alt') || '';
        content.appendChild(img);
    } else if (media.tagName.toLowerCase() === 'video') {
        const video = document.createElement('video');
        const source = media.querySelector('source');
        if (source) {
            const newSource = document.createElement('source');
            newSource.src = source.getAttribute('src');
            newSource.type = source.getAttribute('type') || 'video/mp4';
            video.appendChild(newSource);
        }
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        content.appendChild(video);
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    overlay.classList.add('active');
}

function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.remove('active');
    const content = lightboxOverlay.querySelector('.lightbox-content');
    if (content) content.innerHTML = '';
}

function initWorkLightbox() {
    const overlay = ensureLightbox();
    const closeBtn = overlay.querySelector('.lightbox-close');
    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.addEventListener('click', () => closeLightbox());
        closeBtn.dataset.bound = 'true';
    }

    if (!overlay.dataset.bound) {
        overlay.addEventListener('click', (event) => {
            if (event.target.classList.contains('lightbox-overlay')) {
                closeLightbox();
            }
        });
        overlay.dataset.bound = 'true';
    }

    if (!document.body.dataset.lightboxKey) {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeLightbox();
        });
        document.body.dataset.lightboxKey = 'true';
    }

    const mediaBlocks = document.querySelectorAll('.work-media');
    mediaBlocks.forEach((mediaWrap) => {
        if (mediaWrap.dataset.bound) return;
        mediaWrap.addEventListener('click', () => {
            const media = mediaWrap.querySelector('img, video');
            if (!media) return;
            openLightboxFromMedia(media);
        });
        mediaWrap.dataset.bound = 'true';
    });
}

function initProjectsFilter() {
    const filterLinks = document.querySelectorAll('.projects-subjects [data-filter]');
    const projectItems = document.querySelectorAll('.project-line');
    if (filterLinks.length === 0 || projectItems.length === 0) return;

    function setActive(link) {
        filterLinks.forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
    }

    function applyFilter(filterValue) {
        projectItems.forEach((item) => {
            if (filterValue === 'all') {
                item.style.display = '';
                return;
            }
            const categories = (item.dataset.categories || '').split(' ');
            item.style.display = categories.includes(filterValue) ? '' : 'none';
        });
    }

    filterLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const filterValue = link.dataset.filter || 'all';
            setActive(link);
            applyFilter(filterValue);
        });
    });
}

function initCommon() {
    initBackToTop();
    initMobileMenu();
    initAutoVideos();
    initLazyImages();
    initProjectVideos();
    initWorkLightbox();
    initProjectsFilter();
    initNewsCarousel();
}

function initNewsCarousel() {
    const carousel = document.querySelector('.news-carousel');
    if (!carousel) return;
    const track = carousel.querySelector('.news-track');
    const prev = carousel.querySelector('.news-prev');
    const next = carousel.querySelector('.news-next');
    if (!track || !prev || !next) return;

    function getStep() {
        const card = track.querySelector('.news-card');
        if (!card) return 0;
        const gap = parseFloat(getComputedStyle(track).gap || '0');
        return card.getBoundingClientRect().width + gap;
    }

    prev.addEventListener('click', () => {
        track.scrollBy({ left: -getStep(), behavior: 'smooth' });
    });

    next.addEventListener('click', () => {
        track.scrollBy({ left: getStep(), behavior: 'smooth' });
    });
}

function initHeroVideo() {
    const heroVideo = document.querySelector('.hero-video');
    if (!heroVideo) return;
    heroVideo.load();
    const playPromise = heroVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
    }
}

function applyStagger(container) {
    if (!container) return;
    const targets = container.querySelectorAll('header, .hero, section, footer');
    targets.forEach((el, index) => {
        el.classList.add('stagger-item');
        el.style.transitionDelay = `${index * 90}ms`;
        requestAnimationFrame(() => {
            el.classList.add('stagger-in');
        });
    });
}

function setActiveContainer(container) {
    if (container) container.classList.add('is-active');
}

function updateBodyClass(namespace, container) {
    if (!document.body) return;
    let resolved = namespace;
    if (!resolved && container) {
        resolved = container.getAttribute('data-barba-namespace');
    }
    document.body.classList.remove('research-page', 'software-page');
    if (resolved === 'research') {
        document.body.classList.add('research-page');
    } else if (resolved === 'software') {
        document.body.classList.add('software-page');
    }
}

const canUseBarba = window.barba && window.location.protocol !== 'file:';

if (canUseBarba) {
    if (window.barbaPrefetch) {
        window.barba.use(window.barbaPrefetch);
    }

    window.barba.init({
        transitions: [{
            name: 'stagger',
            leave(data) {
                const current = data.current.container;
                current.classList.remove('is-active');
                current.style.transition = 'opacity 0.14s ease';
                current.style.opacity = '0';
                return new Promise((resolve) => {
                    setTimeout(resolve, 140);
                });
            },
            enter(data) {
                const next = data.next.container;
                next.style.opacity = '0';
                requestAnimationFrame(() => {
                    setActiveContainer(next);
                });
            },
            once(data) {
                setActiveContainer(data.next.container);
            },
        }],
        views: [
            {
                namespace: 'home',
                afterEnter() {
                    initHeroVideo();
                },
            },
            {
                namespace: 'about',
                afterEnter() {
                    initCarousel();
                },
            },
            {
                namespace: 'research',
                afterEnter() {},
            },
        ],
    });

    window.barba.hooks.once((data) => {
        updateBodyClass(data?.next?.namespace, data?.next?.container);
        initCommon();
        applyStagger(data.next.container);
    });

    window.barba.hooks.afterEnter((data) => {
        updateBodyClass(data?.next?.namespace, data?.next?.container);
        if (data?.next?.container) {
            data.next.container.style.transition = '';
            data.next.container.style.opacity = '';
        }
        initCommon();
        applyStagger(data.next.container);
    });
} else {
    window.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('[data-barba="container"]');
        setActiveContainer(container);
        initCommon();
        initHeroVideo();
        initCarousel();
        applyStagger(container);
    });
}
