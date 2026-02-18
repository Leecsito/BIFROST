// ═══════════════════════════════════════════════════════════════════════════
// DETAIL.JS - CORREGIDO: BOOTSTRAPPING PROFESIONAL (ESTILO COLAB)
// ═══════════════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const year = parseInt(params.get('year'));
const month = parseInt(params.get('month'));
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let currentData = [];
let allData = [];
let allPredictions = {};

async function init() {
    if (isNaN(year) || isNaN(month)) {
        window.location.href = '../index.html';
        return;
    }

    document.getElementById('reportTitle').textContent = `${monthNames[month]} ${year}`;

    try {
        const [etlData, predData] = await Promise.all([
            fetchNodo('etl'),
            fetchNodo('prediccion')
        ]);

        if (!etlData) throw new Error('Sin datos');

        allData = Object.values(etlData).filter(x => x.Fecha_Transaccion);

        if (predData) {
            allPredictions = predData;
        }

        currentData = allData.filter(tx => {
            const d = new Date(tx.Fecha_Transaccion);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        if (currentData.length === 0) {
            alert('Reporte vacío');
            history.back();
            return;
        }

        renderKPIs();
        renderCategories();

        const predKey = `${year}-${month}`;
        if (allPredictions[predKey]) {
            renderComparison(allPredictions[predKey]);
        } else {
            document.getElementById('trainCard').style.display = 'flex';
        }

    } catch (e) {
        console.error(e);
        alert('Error al cargar datos');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE IA: REPLICANDO LÓGICA DE BOOTSTRAPPING (COLUMNAS COMPLETAS)
// ═══════════════════════════════════════════════════════════════════════════

async function generateRetroPrediction() {
    const btn = document.getElementById('btnTrain');
    btn.disabled = true;
    btn.textContent = "Ejecutando Bootstrapping...";

    try {
        const targetDate = new Date(year, month, 1);

        // 1. Filtrar historial previo a la fecha del reporte para entrenar
        const historyData = allData.filter(d => new Date(d.Fecha_Transaccion) < targetDate);

        if (historyData.length === 0) throw new Error("No hay historia suficiente para predecir este mes");

        // 2. Ejecutar algoritmo con clonación de filas (Bootstrap)
        const resultado = await runAlgoProfesional(historyData, targetDate);

        const predKey = `${year}-${month}`;

        // 3. Preparar el payload con metadatos
        const predictionToSave = {
            ...resultado.datos,
            _metadata: {
                fechaPrediccion: targetDate.toISOString(),
                confianza: resultado.confianza,
                generadaEl: new Date().toISOString(),
                metodo: "Bootstrapping Profesional"
            }
        };

        // 4. Guardar en el nodo de predicciones
        await fetch(`${firebaseConfig.databaseURL}${firebaseConfig.nodos.prediccion}/${predKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(predictionToSave)
        });

        alert('¡IA Entrenada! Predicción generada con éxito.');
        window.location.reload();

    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.textContent = "Integrar a la IA";
    }
}

async function runAlgoProfesional(history, targetDate) {
    const targetIdx = targetDate.getMonth();
    const series = {};

    // Calcular tendencia por años pasados
    history.forEach(r => {
        const d = new Date(r.Fecha_Transaccion);
        if (d.getMonth() === targetIdx) {
            const y = d.getFullYear();
            series[y] = (series[y] || 0) + 1;
        }
    });

    const years = Object.keys(series).sort();
    let predictionCount = 100;

    if (years.length > 0) {
        const lastCount = series[years[years.length - 1]];
        // Aplicar factor de crecimiento (ajuste del 30% de la tendencia)
        const growth = years.length >= 2 ? (lastCount - series[years[years.length - 2]]) / series[years[years.length - 2]] : 0.05;
        predictionCount = Math.floor(lastCount * (1 + (growth * 0.3)));
    }

    // POOL: Usar datos del mismo mes de años anteriores para clonar filas completas
    const pool = history.filter(r => new Date(r.Fecha_Transaccion).getMonth() === targetIdx);
    const finalPool = pool.length > 0 ? pool : history.slice(-500);

    const generated = {};
    for (let i = 0; i < predictionCount; i++) {
        // Seleccionamos una fila real del historial (Bootstrapping)
        const baseRow = finalPool[Math.floor(Math.random() * finalPool.length)];

        const id = `PRED-RETRO-${year}-${month + 1}-${i + 1}`;
        const dia = Math.floor(Math.random() * 28) + 1;
        const fechaSim = new Date(year, month, dia);

        // CLONAMOS TODAS LAS COLUMNAS (Categoría, Ciudad, Ingresos, etc.)
        generated[id] = {
            ...baseRow,
            ID_Transaccion: id,
            Fecha_Transaccion: fechaSim.toISOString(),
            // Ajuste leve de fraude para la simulación
            Es_Fraude: Math.random() > 0.94 ? "Yes" : "No"
        };
    }

    return { datos: generated, confianza: years.length >= 2 ? 90 : 75 };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI Y RENDERIZADO
// ═══════════════════════════════════════════════════════════════════════════

function renderComparison(predData) {
    const predArr = Object.values(predData).filter(x => x.ID_Transaccion);
    const predTotal = predArr.length;
    const realTotal = currentData.length;

    document.getElementById('comparisonCard').style.display = 'block';
    document.getElementById('aiBadge').style.display = 'flex';

    const max = Math.max(predTotal, realTotal);
    setTimeout(() => {
        document.getElementById('barPred').style.width = `${(predTotal / max) * 100}%`;
        document.getElementById('barReal').style.width = `${(realTotal / max) * 100}%`;
    }, 200);

    document.getElementById('valPred').textContent = predTotal.toLocaleString();
    document.getElementById('valReal').textContent = realTotal.toLocaleString();

    const acc = Math.max(0, 100 - Math.abs((predTotal - realTotal) / realTotal) * 100).toFixed(1);
    const insightEl = document.getElementById('compInsight');
    insightEl.innerHTML = `Precisión del modelo: <strong>${acc}%</strong>`;

    if (parseFloat(acc) > 90) insightEl.style.color = 'var(--success)';
    else if (parseFloat(acc) < 70) insightEl.style.color = 'var(--error)';
}

function renderKPIs() {
    let revenue = 0;
    let fraud = 0;
    currentData.forEach(tx => {
        revenue += parseFloat(tx.Monto) || 0;
        if (String(tx.Es_Fraude).toLowerCase() === 'yes' || tx.Es_Fraude == 1) fraud++;
    });

    document.getElementById('totalTx').textContent = currentData.length.toLocaleString();
    document.getElementById('totalRevenue').textContent = formatMoney(revenue);
    document.getElementById('totalFraud').textContent = fraud;
    document.getElementById('avgTicket').textContent = formatMoney(revenue / currentData.length);

    if ((fraud / currentData.length) > 0.05) {
        document.getElementById('fraudCard').style.border = '1px solid var(--error)';
        document.getElementById('fraudCard').querySelector('.kpi-value').style.color = 'var(--error)';
    }
}

function renderCategories() {
    const counts = {};
    currentData.forEach(tx => {
        const cat = tx.Categoria || 'Otros';
        counts[cat] = (counts[cat] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;

    document.getElementById('categoryList').innerHTML = sorted.map(([cat, c], i) => `
        <div class="category-item">
            <div class="category-rank">${i + 1}</div>
            <div class="category-bar-container">
                <div class="category-bar" style="width:${(c / max) * 100}%">${cat}</div>
            </div>
            <span class="category-count">${c}</span>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// BORRADO POR REPORTE (MES ESPECÍFICO)
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!confirm(`¿Estás seguro de eliminar este reporte permanentemente?\n\nSe borrarán ${currentData.length} transacciones reales y su predicción.`)) return;

    showDeleteModal(currentData.length);

    try {
        const predKey = `${year}-${month}`;
        const totalTasks = currentData.length + (allPredictions[predKey] ? 1 : 0);
        let completed = 0;

        // 1. Borrar transacciones en lotes
        const batchSize = 50;
        for (let i = 0; i < currentData.length; i += batchSize) {
            const batch = currentData.slice(i, i + batchSize);
            const promises = batch.map(tx =>
                fetch(`${firebaseConfig.databaseURL}${firebaseConfig.nodos.etl}/${tx.ID_Transaccion}.json`, { method: 'DELETE' })
            );

            await Promise.all(promises);
            completed += batch.length;
            updateDeleteProgress(completed, totalTasks, `Borrando datos reales...`);
        }

        // 2. Borrar predicción específica del mes
        if (allPredictions[predKey]) {
            updateDeleteProgress(completed, totalTasks, 'Borrando predicción...');
            await fetch(`${firebaseConfig.databaseURL}${firebaseConfig.nodos.prediccion}/${predKey}.json`, {
                method: 'DELETE'
            });
            completed++;
        }

        updateDeleteProgress(totalTasks, totalTasks, '¡Finalizado!');

        setTimeout(() => {
            hideDeleteModal();
            window.location.href = '../index.html';
        }, 800);

    } catch (e) {
        hideDeleteModal();
        alert('Error al borrar: ' + e.message);
    }
});

function showDeleteModal(total) {
    const modal = document.createElement('div');
    modal.id = 'deleteModal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-icon"><i class="fas fa-trash-alt"></i></div>
                <h3 class="modal-title">Eliminando Reporte</h3>
                <p class="modal-subtitle" id="deleteStatus">Iniciando...</p>
                <div class="modal-progress-track">
                    <div class="modal-progress-fill" id="deleteProgressBar"></div>
                </div>
                <p class="modal-percent" id="deletePercent">0%</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateDeleteProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    const bar = document.getElementById('deleteProgressBar');
    if (bar) bar.style.width = percent + '%';
    const txt = document.getElementById('deletePercent');
    if (txt) txt.textContent = percent + '%';
    const status = document.getElementById('deleteStatus');
    if (status) status.textContent = message;
}

function hideDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.remove();
}

function formatMoney(val) {
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K';
    return '$' + val.toFixed(0);
}

init();