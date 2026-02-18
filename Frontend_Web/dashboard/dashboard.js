// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD.JS - MOTOR ANALÍTICO COMPLETO (PYTHON REPLICA)
// ═══════════════════════════════════════════════════════════════════════════

const timeFilter = document.getElementById('timeFilter');
let globalData = [];

// Paleta de colores para gráficos dinámicos
const COLORS = {
    purple: '#4318FF',
    blue: '#3311DB',
    cyan: '#05CD99',
    red: '#EE5D50',
    orange: '#FFB547',
    gray: '#E9EDF7'
};

window.onload = async () => {
    // 1. Carga de datos
    const etlData = await fetchNodo('etl');

    if (etlData) {
        // Transformar objeto a array y castear tipos
        globalData = Object.values(etlData).filter(x => x.Fecha_Transaccion).map(tx => ({
            ...tx,
            fechaObj: new Date(tx.Fecha_Transaccion),
            montoVal: parseFloat(tx.Monto) || 0,
            esFraude: String(tx.Es_Fraude).toLowerCase() === 'yes' || tx.Es_Fraude == 1
        }));

        // Ordenar cronológicamente
        globalData.sort((a, b) => a.fechaObj - b.fechaObj);

        // Render inicial (Últimos 30 días)
        updateDashboard(30);
    }

    // Event Listeners
    timeFilter.addEventListener('change', (e) => {
        const val = e.target.value === 'all' ? 99999 : parseInt(e.target.value);
        updateDashboard(val);
    });

    // Pestañas (Tabs)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
};

function updateDashboard(days) {
    if (globalData.length === 0) return;

    // Filtrar datos según el rango seleccionado
    const now = new Date();
    // Encontrar la última fecha real en el dataset para ser precisos
    const lastDate = globalData[globalData.length - 1].fechaObj;
    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - days);

    const filteredData = (days > 30000)
        ? globalData
        : globalData.filter(d => d.fechaObj >= cutoff);

    // Ejecutar renderizado de todos los gráficos
    renderFraudTrend(filteredData);
    renderAmountVolume(filteredData, days);
    renderPies(filteredData);
    renderTops(filteredData);
    renderFailed(filteredData, days);
    renderDemographics(filteredData);
}

// ─────────────────────────────────────────────────────────────────────────
// 1. TENDENCIA DE FRAUDE (Curva Suavizada SVG)
// ─────────────────────────────────────────────────────────────────────────
function renderFraudTrend(data) {
    // Agrupar por día
    const grouped = {};
    data.forEach(d => {
        const key = d.fechaObj.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!grouped[key]) grouped[key] = { total: 0, fraud: 0 };
        grouped[key].total++;
        if (d.esFraude) grouped[key].fraud++;
    });

    // Crear array de puntos
    const points = Object.keys(grouped).map(k => ({
        date: k,
        rate: (grouped[k].fraud / grouped[k].total) * 100
    }));

    // Si hay muchos puntos, tomar una muestra para suavizar el gráfico
    const displayPoints = points.length > 20
        ? points.filter((_, i) => i % Math.ceil(points.length / 20) === 0)
        : points;

    // Dibujar SVG
    const svg = document.getElementById('fraudLineChart');
    const width = 300;
    const height = 150;
    const padding = 10;

    const maxRate = Math.max(...displayPoints.map(p => p.rate), 1) * 1.2; // +20% margen

    // Algoritmo simple para curva Bezier
    let d = `M 0 ${height}`;

    displayPoints.forEach((p, i) => {
        const x = (i / (displayPoints.length - 1)) * width;
        const y = height - ((p.rate / maxRate) * (height - padding));

        if (i === 0) d = `M ${x} ${y}`;
        else {
            // Puntos de control para suavizado
            const prevX = ((i - 1) / (displayPoints.length - 1)) * width;
            const prevY = height - ((displayPoints[i - 1].rate / maxRate) * (height - padding));
            const cp1x = prevX + (x - prevX) / 2;
            const cp2x = prevX + (x - prevX) / 2;
            d += ` C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
        }
    });

    const areaPath = `${d} L ${width} ${height} L 0 ${height} Z`;

    svg.innerHTML = `
        <path class="area" d="${areaPath}" />
        <path class="line" d="${d}" />
    `;

    // Etiquetas
    const labelsDiv = document.getElementById('fraudLabels');
    if (displayPoints.length > 0) {
        labelsDiv.innerHTML = `
            <span>${formatDate(displayPoints[0].date)}</span>
            <span>${formatDate(displayPoints[displayPoints.length - 1].date)}</span>
        `;
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. VOLUMEN Y MONTOS (Barras Verticales)
// ─────────────────────────────────────────────────────────────────────────
function renderAmountVolume(data, days) {
    const container = document.getElementById('amountBarChart');
    container.innerHTML = '';

    // Agrupación dinámica (Día o Mes)
    const isMonthly = days > 90;
    const grouped = {};

    data.forEach(d => {
        let key = isMonthly
            ? `${d.fechaObj.getMonth() + 1}/${d.fechaObj.getFullYear().toString().substr(2)}`
            : `${d.fechaObj.getDate()}/${d.fechaObj.getMonth() + 1}`;

        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += d.montoVal;
    });

    const keys = Object.keys(grouped);
    // Mostrar máximo 10 barras para que se vea bien en móvil
    const sliceKeys = keys.length > 10 ? keys.slice(-10) : keys;
    const maxVal = Math.max(...sliceKeys.map(k => grouped[k]), 1);

    sliceKeys.forEach(k => {
        const val = grouped[k];
        const percent = (val / maxVal) * 80;

        const barHtml = `
            <div class="bar-wrapper">
                <div class="bar-value">${formatMoneyShort(val)}</div>
                <div class="bar" style="height: ${percent}%"></div>
                <div class="bar-label">${k}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', barHtml);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. PIE CHARTS (Conic Gradients)
// ─────────────────────────────────────────────────────────────────────────
function renderPies(data) {
    // A. Tipos de Transacción
    const typeCounts = {};
    data.forEach(d => {
        const t = d.Tipo_Transaccion || 'Otro';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    drawPie('typePieChart', 'typeLegend', typeCounts, [COLORS.blue, COLORS.cyan, COLORS.orange]);

    // B. Fraude vs Legit
    const fraudCounts = { 'Legítimo': 0, 'Fraude': 0 };
    data.forEach(d => {
        d.esFraude ? fraudCounts['Fraude']++ : fraudCounts['Legítimo']++;
    });
    drawPie('fraudPieChart', 'fraudLegend', fraudCounts, [COLORS.cyan, COLORS.red]);
}

function drawPie(chartId, legendId, counts, palette) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    let startDeg = 0;
    let gradientStr = '';
    const legendHtml = [];
    const keys = Object.keys(counts);

    keys.forEach((key, i) => {
        const val = counts[key];
        const deg = (val / total) * 360;
        const color = palette[i % palette.length];

        gradientStr += `${color} ${startDeg}deg ${startDeg + deg}deg, `;
        startDeg += deg;

        legendHtml.push(`
            <div class="legend-item">
                <div class="legend-dot" style="background:${color}"></div>
                <span>${key}</span>
            </div>
        `);
    });

    const chart = document.getElementById(chartId);
    // Truco CSS para Pie Chart nativo
    chart.style.background = `conic-gradient(${gradientStr.slice(0, -2)})`;
    chart.innerHTML = `<div class="pie-center">${total}</div>`;

    document.getElementById(legendId).innerHTML = legendHtml.join('');
}

// ─────────────────────────────────────────────────────────────────────────
// 4. TOPS (Barras Horizontales)
// ─────────────────────────────────────────────────────────────────────────
function renderTops(data) {
    const groupAndSort = (field) => {
        const counts = {};
        data.forEach(d => {
            const k = d[field] || 'N/A';
            counts[k] = (counts[k] || 0) + d.montoVal;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5
    };

    const drawHorizontal = (id, list) => {
        const container = document.getElementById(id);
        container.innerHTML = '';
        const max = list[0] ? list[0][1] : 1;

        list.forEach(([label, val]) => {
            const percent = (val / max) * 100;
            const html = `
                <div class="h-item">
                    <div class="h-label">${label}</div>
                    <div class="h-track">
                        <div class="h-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="h-val">${formatMoneyShort(val)}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    };

    drawHorizontal('catsList', groupAndSort('Categoria'));
    drawHorizontal('merchList', groupAndSort('Comercio'));
}

// ─────────────────────────────────────────────────────────────────────────
// 5. TRANSACCIONES FALLIDAS - VERSIÓN CORREGIDA (SIN Estado_Transaccion)
// ─────────────────────────────────────────────────────────────────────────
function renderFailed(data, days) {
    const container = document.getElementById('failedBarChart');
    container.innerHTML = '';

    // NUEVA LÓGICA: Detectar transacciones "sospechosas" o de bajo saldo
    // Como criterio alternativo, usamos: transacciones con saldo muy bajo
    // o con montos anormalmente altos que podrían fallar
    const failedData = data.filter(d => {
        const saldo = parseFloat(d.Saldo_Cuenta) || 0;
        const monto = d.montoVal;

        // Criterio 1: Saldo insuficiente (saldo < monto)
        // Criterio 2: Transacciones de alto riesgo (monto muy alto vs saldo)
        return saldo < monto || (monto > saldo * 0.8 && monto > 5000);
    });

    if (failedData.length === 0) {
        container.innerHTML = '<div class="loading-chart">Sin transacciones fallidas detectadas</div>';
        return;
    }

    const isMonthly = days > 90;
    const grouped = {};
    failedData.forEach(d => {
        let key = isMonthly
            ? `${d.fechaObj.getMonth() + 1}/${d.fechaObj.getFullYear().toString().substr(2)}`
            : `${d.fechaObj.getDate()}/${d.fechaObj.getMonth() + 1}`;
        if (!grouped[key]) grouped[key] = 0;
        grouped[key]++;
    });

    const keys = Object.keys(grouped).slice(-8);
    const maxVal = Math.max(...keys.map(k => grouped[k]), 1);

    keys.forEach(k => {
        const val = grouped[k];
        const percent = (val / maxVal) * 80;
        const html = `
            <div class="bar-wrapper">
                <div class="bar-value">${val}</div>
                <div class="bar orange" style="height: ${percent}%"></div>
                <div class="bar-label">${k}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// 6. DEMOGRAFÍA (Histograma)
// ─────────────────────────────────────────────────────────────────────────
function renderDemographics(data) {
    const container = document.getElementById('ageHistogram');
    container.innerHTML = '';

    const buckets = { '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0 };

    data.forEach(d => {
        const age = parseInt(d.Edad_Cliente);
        if (age <= 25) buckets['18-25']++;
        else if (age <= 35) buckets['26-35']++;
        else if (age <= 45) buckets['36-45']++;
        else if (age <= 60) buckets['46-60']++;
        else buckets['60+']++;
    });

    const vals = Object.values(buckets);
    const maxVal = Math.max(...vals, 1);

    Object.keys(buckets).forEach(k => {
        const val = buckets[k];
        const percent = (val / maxVal) * 90;
        const html = `
            <div class="bar-wrapper">
                <div class="bar" style="height: ${percent}%; background:var(--accent-purple)"></div>
                <div class="bar-label" style="font-size:8px">${k}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────
function formatDate(isoStr) {
    const d = new Date(isoStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatMoneyShort(val) {
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
}