// ============================================
// ТДТК.РФ — Основная логика сайта
// Работа с API Google Sheets
// ============================================

// Конфигурация
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbx_M0FX_peXAFKWz5b05bBZ_D1UnKNv721iEhjiud-bQ2Akf29_6D-oCxOVxV9ZBng1/exec', // Замените на ваш URL
    CACHE_TIME: 60000, // 1 минута кэширования
    AUTO_REFRESH_INTERVAL: 300000 // 5 минут автообновление
};

// Кэш данных
let cache = {
    applications: { data: null, timestamp: 0 },
    entrances: { data: null, timestamp: 0 },
    stats: { data: null, timestamp: 0 }
};

// ===== ОСНОВНЫЕ ФУНКЦИИ API =====

async function callAPI(action, data = null) {
    try {
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if(data) {
            options.body = JSON.stringify({ action, ...data });
        } else {
            // GET запрос
            const url = new URL(CONFIG.API_URL);
            url.searchParams.append('action', action);
            const response = await fetch(url.toString());
            return await response.json();
        }
        
        const response = await fetch(CONFIG.API_URL, options);
        return await response.json();
    } catch(error) {
        console.error('API Error:', error);
        showToast('Ошибка соединения с сервером', 'error');
        return { success: false, error: error.message };
    }
}

// Получение всех заявок
async function getApplications(forceRefresh = false) {
    const now = Date.now();
    if(!forceRefresh && cache.applications.data && (now - cache.applications.timestamp) < CONFIG.CACHE_TIME) {
        return cache.applications.data;
    }
    
    const result = await callAPI('getApplications');
    if(result.success) {
        cache.applications.data = result.data;
        cache.applications.timestamp = now;
        return result.data;
    }
    return [];
}

// Получение подъездов
async function getEntrances(forceRefresh = false) {
    const now = Date.now();
    if(!forceRefresh && cache.entrances.data && (now - cache.entrances.timestamp) < CONFIG.CACHE_TIME) {
        return cache.entrances.data;
    }
    
    const result = await callAPI('getEntrances');
    if(result.success) {
        cache.entrances.data = result.data;
        cache.entrances.timestamp = now;
        return result.data;
    }
    return [];
}

// Получение статистики
async function getDashboardStats(forceRefresh = false) {
    const now = Date.now();
    if(!forceRefresh && cache.stats.data && (now - cache.stats.timestamp) < CONFIG.CACHE_TIME) {
        return cache.stats.data;
    }
    
    const result = await callAPI('getDashboardStats');
    if(result.success) {
        cache.stats.data = result.data;
        cache.stats.timestamp = now;
        return result.data;
    }
    return null;
}

// Отправка заявки
async function submitApplication(formData) {
    const result = await callAPI('addApplication', formData);
    if(result.success) {
        // Очищаем кэш
        cache.applications.timestamp = 0;
        cache.entrances.timestamp = 0;
        cache.stats.timestamp = 0;
        showToast('Заявка успешно отправлена!', 'success');
        return true;
    } else {
        showToast('Ошибка отправки: ' + (result.error || 'Попробуйте позже'), 'error');
        return false;
    }
}

// ===== UI ФУНКЦИИ =====

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Настройка бургер-меню
    setupMobileMenu();
    
    // Настройка скролла с offset для фиксированного хедера
    setupSmoothScroll();
    
    // Загрузка прогресса подъездов
    await loadProgress();
    
    // Обновление статистики в hero
    await updateHeroStats();
    
    // Настройка формы
    setupForm();
    
    // Настройка слайдера
    setupSlider();
    
    // Автообновление прогресса
    if(CONFIG.AUTO_REFRESH_INTERVAL > 0) {
        setInterval(async () => {
            await loadProgress(true);
            await updateHeroStats(true);
        }, CONFIG.AUTO_REFRESH_INTERVAL);
    }
});

// Мобильное меню
function setupMobileMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    const closeBtn = document.getElementById('menu-close');
    
    if(!burger) return;
    
    function closeMenu() {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        burger.classList.remove('active');
    }
    
    function openMenu() {
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        burger.classList.add('active');
    }
    
    burger.addEventListener('click', () => {
        if(mobileMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    
    overlay.addEventListener('click', closeMenu);
    if(closeBtn) closeBtn.addEventListener('click', closeMenu);
    
    // Закрытие при клике на ссылку
    document.querySelectorAll('.mobile-nav a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// Плавный скролл
function setupSmoothScroll() {
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 72;
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if(target) {
                e.preventDefault();
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

// Загрузка прогресса подъездов
async function loadProgress(forceRefresh = false) {
    const container = document.getElementById('progress-grid');
    if(!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Загрузка данных...</p></div>';
    
    try {
        let entrances = await getEntrances(forceRefresh);
        
        // Фильтрация
        const searchValue = document.getElementById('search-address')?.value.toLowerCase() || '';
        const filterStatus = document.getElementById('filter-status')?.value || 'all';
        
        entrances = entrances.filter(entrance => {
            const addressMatch = !searchValue || entrance.address.toLowerCase().includes(searchValue);
            const percent = entrance.totalApartments ? (entrance.agreed / entrance.totalApartments) * 100 : 0;
            const isReady = percent >= 50;
            
            if(filterStatus === 'ready') return addressMatch && isReady;
            if(filterStatus === 'in-progress') return addressMatch && !isReady;
            return addressMatch;
        });
        
        if(entrances.length === 0) {
            container.innerHTML = '<div class="no-data"><i class="fas fa-building"></i><p>Подъездов не найдено</p></div>';
            return;
        }
        
        container.innerHTML = entrances.map(entrance => {
            const percent = entrance.totalApartments ? Math.round((entrance.agreed / entrance.totalApartments) * 100) : 0;
            const isReady = percent >= 50;
            const needed = entrance.totalApartments ? Math.ceil(entrance.totalApartments * 0.5) - entrance.agreed : 0;
            
            return `
                <div class="entrance-card ${isReady ? 'ready' : ''}">
                    <div class="card-header">
                        <div>
                            <h3>${escapeHtml(entrance.address)}</h3>
                            <span class="entrance-number">Подъезд №${entrance.entrance}</span>
                        </div>
                        <span class="status-badge ${isReady ? 'ready' : 'progress'}">
                            ${isReady ? '✅ Готов к установке' : '⏳ В процессе сбора'}
                        </span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${isReady ? 'ready' : 'in-progress'}" style="width: ${percent}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span class="current">${entrance.agreed} согласны</span>
                            <span class="needed">Нужно еще: ${needed > 0 ? needed : 0}</span>
                        </div>
                    </div>
                    <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(entrance.tariff || 'Не выбран')}</span>
                        <span><i class="fas fa-calendar"></i> ${entrance.lastUpdate || ''}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch(error) {
        console.error('Error loading progress:', error);
        container.innerHTML = '<div class="no-data"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки данных</p></div>';
    }
}

// Обновление статистики в hero
async function updateHeroStats(forceRefresh = false) {
    const stats = await getDashboardStats(forceRefresh);
    if(!stats) return;
    
    const totalBuildings = document.getElementById('total-buildings');
    const totalApartments = document.getElementById('total-apartments');
    const completedEntrances = document.getElementById('completed-entrances');
    
    if(totalBuildings) totalBuildings.textContent = stats.totalEntrances || 0;
    if(totalApartments) {
        // Считаем квартиры из подъездов
        const entrances = await getEntrances();
        const total = entrances.reduce((sum, e) => sum + (e.totalApartments || 0), 0);
        totalApartments.textContent = total;
    }
    if(completedEntrances) completedEntrances.textContent = stats.readyEntrances || 0;
}

// Настройка формы
function setupForm() {
    const form = document.getElementById('application-form');
    if(!form) return;
    
    // Маска телефона
    const phoneInput = document.getElementById('phone');
    if(phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d+]/g, '');
            if(value.startsWith('7') || value.startsWith('8')) {
                value = '+' + value;
            }
            e.target.value = value;
        });
    }
    
    // Предзаполнение тарифа из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const tariffParam = urlParams.get('tariff');
    if(tariffParam) {
        const radio = document.querySelector(`input[value*="${tariffParam}"]`);
        if(radio) radio.checked = true;
    }
    
    // Обработка отправки
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        
        const formData = {
            address: form.address?.value,
            entrance: form.entrance?.value,
            apartment: form.apartment?.value,
            totalApartments: document.getElementById('total-apartments-form')?.value,
            tariff: getSelectedTariff(form),
            consent: getSelectedConsent(form),
            phone: form.phone?.value,
            name: form.name?.value,
            comment: form.comment?.value
        };
        
        // Валидация
        if(!formData.address || !formData.entrance || !formData.apartment || !formData.totalApartments || !formData.tariff || !formData.consent || !formData.phone) {
            showToast('Заполните все обязательные поля', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        const success = await submitApplication(formData);
        
        if(success) {
            form.reset();
            // Обновляем прогресс
            await loadProgress(true);
            await updateHeroStats(true);
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

function getSelectedTariff(form) {
    const radios = form.querySelectorAll('input[name$="tariff"], input[name="entry.XXXXXXXX"]');
    for(const radio of radios) {
        if(radio.checked && radio.value) {
            return radio.value;
        }
    }
    return null;
}

function getSelectedConsent(form) {
    const radios = form.querySelectorAll('input[value*="согласен"], input[value*="Думаю"]');
    for(const radio of radios) {
        if(radio.checked && radio.value) {
            return radio.value;
        }
    }
    return null;
}

// Слайдер
function setupSlider() {
    const track = document.getElementById('slider-track');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    const dotsContainer = document.getElementById('slider-dots');
    
    if(!track) return;
    
    let currentIndex = 0;
    const slides = track.children;
    const totalSlides = slides.length;
    
    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Обновляем dots
        if(dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.slider-dot');
            dots.forEach((dot, i) => {
                if(i === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
    }
    
    // Создаем dots
    if(dotsContainer && totalSlides > 0) {
        dotsContainer.innerHTML = '';
        for(let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('slider-dot');
            if(i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentIndex = i;
                updateSlider();
            });
            dotsContainer.appendChild(dot);
        }
    }
    
    if(prevBtn) prevBtn.addEventListener('click', prevSlide);
    if(nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    // Свайп для мобильных
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if(touchEndX - touchStartX > 50) prevSlide();
        if(touchStartX - touchEndX > 50) nextSlide();
    });
    
    // Автопрокрутка
    let autoInterval = setInterval(nextSlide, 5000);
    
    const sliderContainer = document.querySelector('.slider-container');
    if(sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => clearInterval(autoInterval));
        sliderContainer.addEventListener('mouseleave', () => {
            autoInterval = setInterval(nextSlide, 5000);
        });
    }
}

// Toast уведомления
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Экранирование HTML
function escapeHtml(text) {
    if(!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавляем стиль для анимации ухода тоста
const style = document.createElement('style');
style.textContent = `
    @keyframes toast-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
