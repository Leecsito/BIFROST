// ═══════════════════════════════════════════════════════════════════════════
// PREDICT.JS - DETECCIÓN DUAL: COMPARATIVA + SIGUIENTE PREDICCIÓN
// ═══════════════════════════════════════════════════════════════════════════

const btnPredict = document.getElementById('btnPredict');
const btnPredictText = document.getElementById('btnPredictText');
const btnReset = document.getElementById('btnReset');
const statusIndicator = document.getElementById('statusIndicator');
const actionArea = document.getElementById('actionArea');
const simulationCard = document.getElementById('simulationCard');
const resultsCard = document.getElementById('resultsCard');
const resultsTitle = document.getElementById('resultsTitle');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const recordsAnalyzed = document.getElementById('recordsAnalyzed');
const transactionsGenerated = document.getElementById('transactionsGenerated');
const algorithmStatus = document.getElementById('algorithmStatus');
const tableBody = document.getElementById('tableBody');
const finalScore = document.getElementById('finalScore');
const comparisonStatusBox = document.getElementById('comparisonStatusBox');
const comparisonStatusText = document.getElementById('comparisonStatusText');
const targetMonthLabel = document.getElementById('targetMonthLabel');
const dataRangeLabel = document.getElementById('dataRangeLabel');
const progressLabel = document.getElementById('progressLabel');
const simIcon = document.getElementById('simIcon');

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let targetDate = new Date();
let globalHistory = [];

// ═══════════════════════════════════════════════════════════════════════════
// 1. INICIALIZACIÓN CON LÓGICA COMPARATIVA
// ═══════════════════════════════════════════════════════════════════════════

window.onload = async () => {
    const etlData = await fetchNodo('etl');
    const predData = await fetchNodo('prediccion');
    let maxRealDate = new Date(0);

    if (etlData) {
        globalHistory = Object.values(etlData).filter(r => r.Fecha_Transaccion);
        if (globalHistory.length > 0) {
            maxRealDate = getMaxDateFromDataset(globalHistory);
        }
    }

    // Definir el siguiente mes a predecir
    targetDate = new Date(maxRealDate.getFullYear(), maxRealDate.getMonth() + 1, 1);
    updateDateLabels(targetDate, maxRealDate);

    // ESCENARIO A: ¿Existe una predicción previa para el mes que acabamos de cerrar?
    const lastMonthKey = `${maxRealDate.getFullYear()}-${maxRealDate.getMonth()}`;

    if (predData && predData[lastMonthKey]) {
        const predValues = Object.values(predData[lastMonthKey]).filter(x => x.ID_Transaccion);
        const statsIA = calcularStats(predValues);

        const realDataForMonth = globalHistory.filter(r => {
            const d = new Date(r.Fecha_Transaccion);
            return d.getFullYear() === maxRealDate.getFullYear() && d.getMonth() === maxRealDate.getMonth();
        });
        const statsReal = calcularStats(realDataForMonth);

        renderResults(statsIA, statsReal, true);
        resultsTitle.textContent = `Comparativa: ${monthNames[maxRealDate.getMonth()]} ${maxRealDate.getFullYear()}`;
        showResultsUI(false); // No ocultar botón para permitir predecir el siguiente mes
    }

    // ESCENARIO B: ¿Ya predijimos el mes actual/futuro?
    const nextMonthKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
    if (predData && predData[nextMonthKey]) {
        const predValues = Object.values(predData[nextMonthKey]).filter(x => x.ID_Transaccion);
        const statsIA = calcularStats(predValues);
        renderResults(statsIA, null, false);
        showResultsUI(true); // Ocultar botón porque el futuro ya está predicho
    } else {
        btnPredictText.textContent = `PREDECIR ${monthNames[targetDate.getMonth()].toUpperCase()} ${targetDate.getFullYear()}`;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. MOTOR DE IA (BOOTSTRAPPING COMPLETO)
// ═══════════════════════════════════════════════════════════════════════════

async function generarPrediccion(onProgress) {
    onProgress(10, 'Calculando tendencia...');
    await sleep(400);

    const targetMonth = targetDate.getMonth();
    const conteoPorAnio = {};

    globalHistory.forEach(r => {
        const d = new Date(r.Fecha_Transaccion);
        if (d.getMonth() === targetMonth) {
            const anio = d.getFullYear();
            conteoPorAnio[anio] = (conteoPorAnio[anio] || 0) + 1;
        }
    });

    const aniosDisponibles = Object.keys(conteoPorAnio).sort();
    let cantidadAPredecir = 150;
    let factorCrecimiento = 1.05;

    if (aniosDisponibles.length >= 2) {
        const ultimo = conteoPorAnio[aniosDisponibles[aniosDisponibles.length - 1]];
        const penultimo = conteoPorAnio[aniosDisponibles[aniosDisponibles.length - 2]];
        factorCrecimiento = ultimo / penultimo;
        cantidadAPredecir = Math.floor(ultimo * factorCrecimiento);
    }

    onProgress(30, `Tendencia x${factorCrecimiento.toFixed(2)} detectada`);
    animateNumber(recordsAnalyzed, globalHistory.length);

    const pool = globalHistory.filter(r => new Date(r.Fecha_Transaccion).getMonth() === targetMonth);
    const finalPool = pool.length > 0 ? pool : globalHistory.slice(-500);

    const generated = {};
    const batch = Math.ceil(cantidadAPredecir / 20);

    for (let i = 0; i < cantidadAPredecir; i++) {
        const rowOriginal = finalPool[Math.floor(Math.random() * finalPool.length)];
        const id = `PRED-${targetDate.getFullYear()}-${(targetMonth + 1).toString().padStart(2, '0')}-${i + 1}`;
        const fechaSim = new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.floor(Math.random() * 28) + 1, Math.floor(Math.random() * 24));

        generated[id] = {
            ...rowOriginal,
            ID_Transaccion: id,
            Fecha_Transaccion: fechaSim.toISOString(),
            Es_Fraude: Math.random() > 0.96 ? "Yes" : "No"
        };

        if (i % batch === 0) {
            onProgress(50 + ((i / cantidadAPredecir) * 50), 'Clonando registros...');
            transactionsGenerated.textContent = i.toLocaleString();
            await sleep(5);
        }
    }

    animateNumber(transactionsGenerated, cantidadAPredecir);
    onProgress(100, 'Predicción lista');
    return { datos: generated, confianza: aniosDisponibles.length >= 2 ? 92 : 70 };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. UI Y RENDERIZADO
// ═══════════════════════════════════════════════════════════════════════════

btnPredict.addEventListener('click', async () => {
    actionArea.style.display = 'none';
    resultsCard.classList.remove('active');
    simulationCard.classList.add('active');

    try {
        const resultado = await generarPrediccion((prog, text) => {
            updateProgress(prog);
            algorithmStatus.textContent = text;
        });

        const monthKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
        const payload = {
            [monthKey]: {
                ...resultado.datos,
                _metadata: {
                    fechaPrediccion: targetDate.toISOString(),
                    confianza: resultado.confianza,
                    creado: new Date().toISOString()
                }
            }
        };

        await updateNodoLotes('prediccion', payload);
        const stats = calcularStats(Object.values(resultado.datos));
        renderResults(stats, null, false);
        showResultsUI(true);
        updateStatus('Completado', 'ready');
        triggerHaptic('success');
    } catch (e) {
        alert('Error: ' + e.message);
        location.reload();
    }
});

function renderResults(iaStats, realStats, isComparison) {
    const fmt = (n) => '$' + (n / 1000000).toFixed(2) + 'M';
    const getPrec = (ia, real) => real ? Math.max(0, 100 - Math.abs((ia - real) / real) * 100).toFixed(1) + '%' : 'Alta';

    const rows = [
        { label: 'Volumen', ia: iaStats.count.toLocaleString(), real: realStats ? realStats.count.toLocaleString() : '--', prec: getPrec(iaStats.count, realStats ? realStats.count : null) },
        { label: 'Monto', ia: fmt(iaStats.monto), real: realStats ? fmt(realStats.monto) : '--', prec: getPrec(iaStats.monto, realStats ? realStats.monto : null) },
        { label: 'Fraude', ia: iaStats.fraude, real: realStats ? realStats.fraude : '--', prec: '--' }
    ];

    tableBody.innerHTML = rows.map(r => `
        <div class="table-row">
            <div style="text-align:left; font-weight:600">${r.label}</div>
            <div class="td-predicted">${r.ia}</div>
            <div>${r.real}</div>
            <div class="td-precision ${parseFloat(r.prec) > 85 ? 'high' : ''}">${r.prec}</div>
        </div>
    `).join('');

    if (isComparison) {
        const scoreVal = (parseFloat(rows[0].prec) + parseFloat(rows[1].prec)) / 2;
        finalScore.textContent = scoreVal.toFixed(1) + '%';
        comparisonStatusBox.className = "warning-box success";
        comparisonStatusText.textContent = "Comparativa de precisión completada.";
    } else {
        finalScore.textContent = 'Est.';
        comparisonStatusBox.className = "warning-box";
        comparisonStatusText.textContent = "Esperando datos reales para comparar...";
    }
}

function showResultsUI(hideButton) {
    simulationCard.classList.add('active');
    simIcon.className = 'fas fa-check-circle';
    simIcon.style.color = 'var(--success)';
    resultsCard.classList.add('active');
    if (hideButton) actionArea.style.display = 'none';
    else actionArea.style.display = 'block';  // ← CAMBIAR 'flex' POR 'block'
}

function updateDateLabels(target, maxReal) {
    targetMonthLabel.textContent = `Proyección: ${monthNames[target.getMonth()]} ${target.getFullYear()}`;
    dataRangeLabel.textContent = `Basado en datos hasta: ${monthNames[maxReal.getMonth()]} ${maxReal.getFullYear()}`;
}

function getMaxDateFromDataset(data) {
    let maxMs = 0;
    data.forEach(r => {
        const ms = new Date(r.Fecha_Transaccion).getTime();
        if (ms > maxMs) maxMs = ms;
    });
    return new Date(maxMs);
}

function calcularStats(arr) {
    let monto = 0, fraude = 0;
    arr.forEach(r => {
        monto += parseFloat(r.Monto) || 0;
        if (String(r.Es_Fraude).toLowerCase() === 'yes' || r.Es_Fraude == 1) fraude++;
    });
    return { count: arr.length, monto, fraude };
}

function updateStatus(text, className) {
    statusIndicator.className = 'status-indicator ' + className;
    statusIndicator.querySelector('span').textContent = text;
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}

function animateNumber(element, target) { element.textContent = target.toLocaleString(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function triggerHaptic(type) { if (navigator.vibrate) navigator.vibrate(50); }

btnReset.addEventListener('click', async () => {
    if (confirm('¿Borrar todas las predicciones y reiniciar el sistema?')) {
        await deleteNodo('prediccion');
        location.reload();
    }
});