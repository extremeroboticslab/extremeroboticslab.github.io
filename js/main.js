// 1. Initialize Lenis Smooth Scroll
const lenis = new Lenis({
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
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('nav-active');
    });
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
            if (entry.isIntersecting) {
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
        video.muted = true;
        video.playsInline = true;
        autoVideoObserver.observe(video);
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

function initCommon() {
    initBackToTop();
    initMobileMenu();
    initAutoVideos();
    initWorkLightbox();
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
        initCommon();
        applyStagger(data.next.container);
    });

    window.barba.hooks.afterEnter((data) => {
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
