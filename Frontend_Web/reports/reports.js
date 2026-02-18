// ═══════════════════════════════════════════════════════════════════════════
// REPORTS.JS - VERSIÓN FILTRADA (SOLO 2023 - 2025)
// ═══════════════════════════════════════════════════════════════════════════

const reportsList = document.getElementById('reportsList');
const totalReportsEl = document.getElementById('totalReports');
const avgAccuracyEl = document.getElementById('avgAccuracy');
const accuracyChart = document.getElementById('accuracyChart');
const searchInput = document.getElementById('searchInput');

let groupedData = {};
let allPredictions = {};

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

async function init() {
    renderLoading();

    try {
        const [etlData, predData] = await Promise.all([
            fetchNodo('etl'),
            fetchNodo('prediccion')
        ]);

        if (!etlData) {
            renderEmpty();
            return;
        }

        if (predData) {
            allPredictions = predData;
        }

        processReports(etlData);
        renderReports();
        renderChart();

        // Buscador
        searchInput.addEventListener('input', () => {
            renderReports(searchInput.value.toLowerCase());
        });

    } catch (e) {
        console.error(e);
        reportsList.innerHTML = `<div class="loading-state" style="color:var(--error)">Error de conexión</div>`;
    }
}

function processReports(data) {
    groupedData = {};
    const entries = Object.values(data);

    entries.forEach(tx => {
        if (!tx || !tx.Fecha_Transaccion) return;

        const date = new Date(tx.Fecha_Transaccion);
        const year = date.getFullYear();

        // FILTRO: Solo reportes después de 2022 (Es decir, 2023, 2024, 2025...)
        if (year <= 2022) return;

        const key = `${year}-${date.getMonth()}`;

        if (!groupedData[key]) {
            groupedData[key] = {
                year: year,
                monthIndex: date.getMonth(),
                totalTransacciones: 0,
                totalMonto: 0,
                ids: [],
                hasPrediction: false,
                accuracy: 0
            };
        }

        groupedData[key].totalTransacciones++;
        groupedData[key].totalMonto += parseFloat(tx.Monto) || 0;
        groupedData[key].ids.push(tx.ID_Transaccion);
    });

    Object.keys(groupedData).forEach(key => {
        if (allPredictions[key] && allPredictions[key]._metadata) {
            groupedData[key].hasPrediction = true;
            groupedData[key].accuracy = allPredictions[key]._metadata.confianza || 90;
        }
    });
}

function renderReports(filter = "") {
    reportsList.innerHTML = '';

    // Ordenar llaves (de más reciente a más antiguo)
    const keys = Object.keys(groupedData).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearB !== yearA ? yearB - yearA : monthB - monthA;
    });

    const filteredKeys = keys.filter(key => {
        const report = groupedData[key];
        const monthYearStr = `${fullMonthNames[report.monthIndex]} ${report.year}`.toLowerCase();
        return monthYearStr.includes(filter);
    });

    if (filteredKeys.length === 0) {
        reportsList.innerHTML = `<div class="loading-state"><p>No hay reportes disponibles desde 2023.</p></div>`;
        return;
    }

    let totalAcc = 0;
    let predictedCount = 0;

    filteredKeys.forEach((key, index) => {
        const report = groupedData[key];

        let badgeHTML = report.hasPrediction
            ? `<span class="ai-badge trained"><i class="fas fa-check-circle"></i> IA Verificada</span>`
            : `<span class="ai-badge pending">Sin Predicción</span>`;

        if (report.hasPrediction) {
            totalAcc += report.accuracy;
            predictedCount++;
        }

        const card = document.createElement('div');
        card.className = 'report-card slide-in-up';
        card.style.animationDelay = `${index * 0.05}s`;

        card.onclick = (e) => {
            if (e.target.closest('.btn-trash')) return;
            window.location.href = `details/index.html?year=${report.year}&month=${report.monthIndex}`;
        };

        card.innerHTML = `
            <div class="r-content">
                <div class="r-header">
                    <div class="r-title">${fullMonthNames[report.monthIndex]} ${report.year}</div>
                    ${badgeHTML}
                </div>
                <div class="r-stats">
                    <span><i class="fas fa-receipt"></i> ${report.totalTransacciones.toLocaleString()}</span>
                    <span><i class="fas fa-dollar-sign"></i> ${formatMoney(report.totalMonto)}</span>
                </div>
            </div>
            <div class="r-actions">
                <button class="btn-trash" onclick="deleteReport(event, '${key}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        reportsList.appendChild(card);
    });

    if (filter === "") {
        animateNumber(totalReportsEl, keys.length);
        if (predictedCount > 0) {
            const avg = Math.round(totalAcc / predictedCount);
            avgAccuracyEl.textContent = `${avg}%`;
        } else {
            avgAccuracyEl.textContent = "--";
        }
    }
}

function renderChart() {
    // Tomar los últimos 6 meses del set filtrado para el gráfico de arriba
    const keys = Object.keys(groupedData).sort().slice(-6);
    if (keys.length === 0) {
        accuracyChart.innerHTML = '<p style="font-size:12px; opacity:0.5">Esperando datos de IA...</p>';
        return;
    }

    let html = '';
    keys.forEach(key => {
        const report = groupedData[key];
        const acc = report.hasPrediction ? report.accuracy : 0;
        const height = report.hasPrediction ? acc : 10;
        const colorClass = acc > 90 ? 'high' : (acc > 75 ? 'mid' : 'low');
        const opacity = report.hasPrediction ? '1' : '0.2';

        html += `
            <div class="chart-bar-wrapper">
                <div class="chart-val">${report.hasPrediction ? acc + '%' : ''}</div>
                <div class="chart-bar ${colorClass}" style="height:${height}%; opacity:${opacity}"></div>
                <div class="chart-label">${monthNames[report.monthIndex]}</div>
            </div>
        `;
    });
    accuracyChart.innerHTML = html;
}

// --- Lógica de Borrado y Auxiliares ---

window.deleteReport = async (event, key) => {
    event.stopPropagation();
    const report = groupedData[key];
    if (!confirm(`¿Eliminar reporte de ${fullMonthNames[report.monthIndex]} ${report.year}?`)) return;

    showDeleteModal();

    try {
        const totalTasks = report.ids.length + (allPredictions[key] ? 1 : 0);
        let completed = 0;

        for (let i = 0; i < report.ids.length; i += 50) {
            const batch = report.ids.slice(i, i + 50);
            await Promise.all(batch.map(id =>
                fetch(`${firebaseConfig.databaseURL}${firebaseConfig.nodos.etl}/${id}.json`, { method: 'DELETE' })
            ));
            completed += batch.length;
            updateDeleteProgress(completed, totalTasks);
        }

        if (allPredictions[key]) {
            await fetch(`${firebaseConfig.databaseURL}${firebaseConfig.nodos.prediccion}/${key}.json`, { method: 'DELETE' });
            delete allPredictions[key];
        }

        setTimeout(() => { hideDeleteModal(); init(); }, 800);
    } catch (e) {
        hideDeleteModal();
        alert('Error: ' + e.message);
    }
};

function showDeleteModal() {
    const modal = document.createElement('div');
    modal.id = 'deleteModal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-icon"><i class="fas fa-trash-alt"></i></div>
                <h3 class="modal-title">Limpiando Base de Datos</h3>
                <div class="modal-progress-track"><div class="modal-progress-fill" id="deleteProgressBar"></div></div>
                <p class="modal-percent" id="deletePercent">0%</p>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function updateDeleteProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    const bar = document.getElementById('deleteProgressBar');
    const txt = document.getElementById('deletePercent');
    if (bar) bar.style.width = percent + '%';
    if (txt) txt.textContent = percent + '%';
}

function hideDeleteModal() { document.getElementById('deleteModal')?.remove(); }
function formatMoney(val) { return val >= 1000000 ? '$' + (val / 1000000).toFixed(1) + 'M' : '$' + (val / 1000).toFixed(0) + 'K'; }
function animateNumber(el, val) { el.textContent = val.toLocaleString(); }
function renderLoading() { reportsList.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Sincronizando reportes...</p></div>`; }
function renderEmpty() { reportsList.innerHTML = `<div class="loading-state"><p>No hay datos desde 2023.</p></div>`; }

init();