// ═══════════════════════════════════════════════════════════════════════════
// MAIN.JS - BIENVENIDA Y ENRUTAMIENTO
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const btnStart = document.getElementById('btnStart');

    btnStart.addEventListener('click', () => {

        // 1. Feedback visual
        if (navigator.vibrate) {
            navigator.vibrate(40);
        }

        // 2. Efecto de salida (Fade Out del cristal)
        document.querySelector('.glass-overlay').style.transition = 'opacity 0.5s ease';
        document.querySelector('.glass-overlay').style.opacity = '0';

        // 3. Redirección
        setTimeout(() => {
            window.location.href = 'inicio/index.html';
        }, 500);

    });

    // Precarga
    setTimeout(() => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = 'inicio/index.html';
        document.head.appendChild(link);
    }, 1000);

});