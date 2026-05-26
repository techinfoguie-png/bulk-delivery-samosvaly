// ============================================
// ТДТК.РФ — Твой Дом Твоя Крепость
// Город: Макаров
// ============================================

// URL Google Apps Script Web App (замените после деплоя)
const API_URL = 'ВАШ_URL_GOOGLE_APPS_SCRIPT';

// Демо-данные для г. Макаров (пока нет подключения к API)
const DEMO_DATA = [
    { address: 'ул. Ленина, д. 10', entrance: 1, agreed: 12, total: 20, lastUpdate: '2026-05-25', tariff: 'Домофон + камера, 350р/мес' },
    { address: 'ул. Ленина, д. 10', entrance: 2, agreed: 8, total: 18, lastUpdate: '2026-05-24', tariff: 'Домофон стандарт, 200р/мес' },
    { address: 'пр. Мира, д. 5', entrance: 1, agreed: 15, total: 24, lastUpdate: '2026-05-26', tariff: 'Домофон + камера, 350р/мес' },
    { address: 'ул. Гагарина, д. 15', entrance: 1, agreed: 6, total: 16, lastUpdate: '2026-05-20', tariff: 'Домофон стандарт, 200р/мес' },
    { address: 'ул. Гагарина, д. 15', entrance: 2, agreed: 11, total: 16, lastUpdate: '2026-05-23', tariff: 'Домофон + камера, 350р/мес' },
    { address: 'ул. Гагарина, д. 15', entrance: 3, agreed: 14, total: 22, lastUpdate: '2026-05-25', tariff: 'Домофон + камера, без абонплаты +10000' },
    { address: 'ул. Победы, д. 8', entrance: 1, agreed: 9, total: 14, lastUpdate: '2026-05-22', tariff: 'Домофон стандарт, 200р/мес' },
    { address: 'ул. Победы, д. 8', entrance: 2, agreed: 16, total: 28, lastUpdate: '2026-05-26', tariff: 'Домофон + камера, 350р/мес' },
    { address: 'ул. Садовая, д. 3', entrance: 1, agreed: 8, total: 12, lastUpdate: '2026-05-21', tariff: 'Домофон стандарт, без абонплаты +10000' },
];

// Инициализация
let currentSlide = 0;
let totalSlides = 5;
let autoSlideInterval;

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initCounters();
    loadProgress();
    initFilters();
    initForm();
    initSlider();
    initSmoothScroll();
    initTariffSelection();
    initPhoneMask();
});

// ===== ШАПКА СКРОЛЛ =====
function initHeader() {
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// ===== МОБИЛЬНОЕ МЕНЮ =====
function initMobileMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    const closeBtn = document.getElementById('menu-close');
    const mobileLinks = mobileMenu.querySelectorAll('a');

    function openMenu() {
        burger.classList.add('active');
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        burger.classList.remove('active');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// ===== АНИМАЦИЯ СЧЁТЧИКОВ =====
function initCounters() {
    const counters = [
        { el: document.getElementById('total-buildings'), target: 47 },
        { el: document.getElementById('total-apartments'), target: 1240 },
        { el: document.getElementById('completed-entrances'), target: 12 }
    ];

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = counters.find(c => c.el === entry.target);
                if (counter) {
                    animateCounter(counter.el, counter.target);
                    observer.unobserve(entry.target);
                }
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(({ el }) => {
        if (el) observer.observe(el);
    });
}

function animateCounter(el, target) {
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString('ru-RU');
    }, 25);
}

// ===== ЗАГРУЗКА ПРОГРЕССА =====
async function loadProgress() {
    const grid = document.getElementById('progress-grid');

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        renderProgress(data);
    } catch (error) {
        console.log('API недоступен, используем демо-данные г. Макаров');
        renderProgress(DEMO_DATA);
    }
}

function renderProgress(data) {
    const grid = document.getElementById('progress-grid');

    if (!data || data.length === 0) {
        grid.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 15px; display: block;"></i>
                Пока нет данных. Будьте первыми — подайте заявку!
            </div>`;
        return;
    }

    // Группировка по адресу + подъезд
    const grouped = {};
    data.forEach(item => {
        const key = `${item.address}|${item.entrance}`;
        if (!grouped[key]) {
            grouped[key] = {
                address: item.address,
                entrance: item.entrance,
                agreed: 0,
                total: item.total,
                lastUpdate: item.lastUpdate,
                tariff: item.tariff || 'Не указан'
            };
        }
        if (item.agreed || (item.consent && item.consent.includes('Да'))) {
            grouped[key].agreed++;
        }
    });

    grid.innerHTML = '';

    Object.values(grouped).forEach(item => {
        const percent = Math.round((item.agreed / item.total) * 100);
        const isReady = percent >= 50;
        const needed = Math.ceil(item.total * 0.5) - item.agreed;

        const card = document.createElement('div');
        card.className = `entrance-card ${isReady ? 'ready' : ''}`;
        card.dataset.address = item.address.toLowerCase();
        card.dataset.status = isReady ? 'ready' : 'in-progress';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3><i class="fas fa-building" style="color: var(--primary-light); margin-right: 6px;"></i>${item.address}</h3>
                    <span class="entrance-number">Подъезд ${item.entrance} • ${item.total} квартир</span>
                </div>
                <span class="status-badge ${isReady ? 'ready' : 'progress'}">
                    ${isReady ? '<i class="fas fa-check-circle"></i> Готов' : '<i class="fas fa-clock"></i> В процессе'}
                </span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${isReady ? 'ready' : 'in-progress'}" 
                         style="width: ${Math.min(percent, 100)}%"></div>
                </div>
                <div class="progress-stats">
                    <span class="current">
                        <i class="fas fa-users" style="margin-right: 4px;"></i>${item.agreed} согласились (${percent}%)
                    </span>
                    <span class="needed">
                        ${needed > 0 ? `Нужно ещё: ${needed} кв.` : '<i class="fas fa-check" style="color: var(--success);"></i> Достаточно!'}
                    </span>
                </div>
            </div>
            <div style="margin-top: 12px; padding-left: 8px;">
                <span style="font-size: 0.8rem; color: var(--text-dim);">
                    <i class="fas fa-tag" style="margin-right: 4px;"></i>${item.tariff}
                </span>
            </div>
            <small style="color: var(--text-dim); font-size: 0.75rem; display: block; margin-top: 8px; padding-left: 8px;">
                <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>Обновлено: ${item.lastUpdate || 'недавно'}
            </small>
        `;

        grid.appendChild(card);
    });
}

// ===== ФИЛЬТРЫ =====
function initFilters() {
    const searchInput = document.getElementById('search-address');
    const statusFilter = document.getElementById('filter-status');

    function filterCards() {
        const query = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;
        const cards = document.querySelectorAll('.entrance-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const matchesSearch = !query || card.dataset.address.includes(query);
            const matchesStatus = status === 'all' || card.dataset.status === status;

            if (matchesSearch && matchesStatus) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Показать сообщение если ничего не найдено
        const grid = document.getElementById('progress-grid');
        const existingNoResults = grid.querySelector('.no-results');

        if (visibleCount === 0 && cards.length > 0) {
            if (!existingNoResults) {
                const noResults = document.createElement('div');
                noResults.className = 'no-data no-results';
                noResults.innerHTML = `
                    <i class="fas fa-search" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 10px; display: block;"></i>
                    По вашему запросу ничего не найдено
                `;
                grid.appendChild(noResults);
            }
        } else if (existingNoResults) {
            existingNoResults.remove();
        }
    }

    searchInput.addEventListener('input', filterCards);
    statusFilter.addEventListener('change', filterCards);
}

// ===== ФОРМА =====
function initForm() {
    const form = document.getElementById('application-form');

    form.addEventListener('submit', (e) => {
        // Валидация
        const address = document.getElementById('address').value.trim();
        const entrance = document.getElementById('entrance').value;
        const apartment = document.getElementById('apartment').value;
        const total = document.getElementById('total-apartments-form').value;
        const phone = document.getElementById('phone').value.trim();

        if (!address || !entrance || !apartment || !total || !phone) {
            e.preventDefault();
            showToast('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        if (parseInt(apartment) > parseInt(total)) {
            e.preventDefault();
            showToast('Номер квартиры не может быть больше общего количества', 'error');
            return;
        }

        // Показать уведомление об успехе
        showToast('✅ Заявка отправлена! Спасибо за участие. Данные по вашему подъезду обновятся в течение нескольких минут.', 'success');

        // Через небольшую задержку сбросить форму
        setTimeout(() => {
            form.reset();
        }, 1000);
    });
}

// ===== МАСКА ТЕЛЕФОНА =====
function initPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }

        let formatted = '+7';

        if (value.length > 0) {
            formatted += ' (' + value.substring(0, 3);
        }
        if (value.length >= 3) {
            formatted += ') ' + value.substring(3, 6);
        }
        if (value.length >= 6) {
            formatted += '-' + value.substring(6, 8);
        }
        if (value.length >= 8) {
            formatted += '-' + value.substring(8, 10);
        }

        e.target.value = formatted;
    });
}

// ===== ВЫБОР ТАРИФА =====
function initTariffSelection() {
    const tariffButtons = document.querySelectorAll('[data-tariff]');
    const tariffRadios = document.querySelectorAll('.tariff-radio input');

    tariffButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tariff = e.target.dataset.tariff;

            // Найти соответствующую радио-кнопку
            tariffRadios.forEach(radio => {
                if (tariff === 'standard' && radio.value.includes('стандарт')) {
                    radio.checked = true;
                } else if (tariff === 'camera' && radio.value.includes('камера')) {
                    radio.checked = true;
                }
            });

            // Прокрутить к форме
            document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
            showToast('Тариф выбран! Проверьте форму ниже.', 'success');
        });
    });
}

// ===== СЛАЙДЕР =====
function initSlider() {
    const track = document.getElementById('slider-track');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    const dotsContainer = document.getElementById('slider-dots');

    if (!track) return;

    // Создать точки
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }

    function goToSlide(index) {
        currentSlide = index;
        track.style.transform = `translateX(-${currentSlide * 100}%)`;

        // Обновить точки
        document.querySelectorAll('.slider-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        goToSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        goToSlide(currentSlide);
    }

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoSlide();
    });

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoSlide();
    });

    // Свайп на мобильных
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
            resetAutoSlide();
        }
    }

    // Автопрокрутка
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 6000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    startAutoSlide();
}

// ===== ПЛАВНАЯ ПРОКРУТКА =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

// ===== TOAST УВЕДОМЛЕНИЯ =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
