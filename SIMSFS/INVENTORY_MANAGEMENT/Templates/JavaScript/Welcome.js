// ============================================================
// Navigation — menu icon toggle (mobile)
// ============================================================
let menuIcon = document.querySelector('#menu-icon');
let navbar   = document.querySelector('.navbar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
};

// ============================================================
// Scroll handler
// FIX: Section IDs updated to match HTML:
//      #contact-us   → Contact Us section
//      #get-started  → Get Started section
// ============================================================
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

window.onscroll = () => {
    let scrollTop = window.scrollY;

    sections.forEach(sec => {
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id     = sec.getAttribute('id');

        if (scrollTop >= offset && scrollTop < offset + height) {
            // Highlight the matching nav link
            navLinks.forEach(link => link.classList.remove('active'));

            // querySelector needs the value escaped if it starts with a digit;
            // our IDs are safe strings, so this is fine.
            let matchingLink = document.querySelector('header nav a[href="#' + id + '"]');
            if (matchingLink) matchingLink.classList.add('active');

            // Trigger scroll animations for the visible section
            sec.classList.add('show-animate');
        } else {
            sec.classList.remove('show-animate');
        }
    });

    // Sticky header
    let header = document.querySelector('header');
    header.classList.toggle('sticky', scrollTop > 100);

    // Close mobile nav on scroll
    menuIcon.classList.remove('bx-x');
    navbar.classList.remove('active');

    // Footer show-animate
    // FIX: Use add() not toggle(). The footer animation should trigger
    // once when the bottom of the page is reached and stay — toggling
    // it off causes the cover spans to reappear when scrolling back up.
    let footer = document.querySelector('footer');
    if (footer) {
        if (window.innerHeight + window.scrollY >= document.scrollingElement.scrollHeight - 5) {
            footer.classList.add('show-animate');
        }
    }
};

// ============================================================
// Smooth scroll for all anchor links (including nav)
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;           // skip bare # links

        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Close mobile menu after clicking a nav link
        menuIcon.classList.remove('bx-x');
        navbar.classList.remove('active');
    });
});

// ============================================================
// Service card hover — slight scale lift
// ============================================================
document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-1rem) scale(1.02)';
    });
    card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// ============================================================
// Intersection Observer — fade-in for feature items
// ============================================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity    = '1';
            entry.target.style.transform  = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-item').forEach(item => {
    item.style.opacity    = '0';
    item.style.transform  = 'translateY(2rem)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(item);
});

// ============================================================
// Info-box entrance animation (Get Started section)
// ============================================================
const infoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateX(0)';
            }, idx * 150);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.info-box').forEach(box => {
    box.style.opacity    = '0';
    box.style.transform  = 'translateX(-2rem)';
    box.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    infoObserver.observe(box);
});

// ============================================================
// Contact Us form — basic client-side validation
// ============================================================
const contactForm = document.querySelector('.contact-us-form');

if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        const inputs = this.querySelectorAll('input[required], textarea[required]');
        let allFilled = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                allFilled = false;
                input.style.borderColor = '#ff4444';
                input.addEventListener('input', () => {
                    input.style.borderColor = '';
                }, { once: true });
            }
        });

        if (!allFilled) {
            e.preventDefault();
            alert('Please fill in all required fields before submitting.');
        }
    });
}

// ============================================================
// Page load fade-in
// ============================================================
window.addEventListener('load', () => {
    document.body.style.opacity    = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

console.log('InvenTrack v1.0 — Welcome page ready.');