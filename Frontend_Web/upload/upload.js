// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD.JS - INGESTA CON ANIMACIÓN VISIBLE
// ═══════════════════════════════════════════════════════════════════════════

// UI Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const btnSelect = document.getElementById('btnSelect');
const uploadCard = document.getElementById('uploadCard');
const previewContainer = document.getElementById('previewContainer');
const btnClosePreview = document.getElementById('btnClosePreview');
const btnUpload = document.getElementById('btnUpload');
const duplicateAlert = document.getElementById('duplicateAlert');
const previewTitle = document.getElementById('previewTitle');
const previewBadge = document.getElementById('previewBadge');

// KPIs Elements
const prevTx = document.getElementById('prevTx');
const prevAmount = document.getElementById('prevAmount');
const prevFraud = document.getElementById('prevFraud');

// Process Elements
const processCard = document.getElementById('processCard');
const globalProgress = document.getElementById('globalProgress');
const statusText = document.getElementById('statusText');
const stepDelete = document.getElementById('stepDelete');

const steps = {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3')
};

// State
let selectedFile = null;
let parsedData = null;
let analysisResult = null;
let isDuplicate = false;
let existingIds = [];

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ═══════════════════════════════════════════════════════════════════════════
// 1. SELECCIÓN DE ARCHIVO Y PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

btnSelect.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('active'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    handleFileSelect(e.dataTransfer.files[0]);
});

btnClosePreview.addEventListener('click', resetSelection);

function handleFileSelect(file) {
    if (!file || !file.name.endsWith('.csv')) {
        alert('Por favor selecciona un archivo .csv válido');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = async (e) => {
        await analyzeFileContent(e.target.result);
    };
    reader.readAsText(selectedFile);
}

async function analyzeFileContent(csvText) {
    parsedData = procesarCSVTexto(csvText); // Backend Fn
    const records = Object.values(parsedData);

    if (records.length === 0) {
        alert('Archivo vacío o incorrecto.');
        resetSelection();
        return;
    }

    const sample = records.find(r => r.Transaction_Date || r.Fecha_Transaccion);
    if (!sample) { alert('Sin fechas válidas.'); return; }

    const dateStr = sample.Transaction_Date || sample.Fecha_Transaccion;
    const dateObj = new Date(dateStr);
    const reportMonth = dateObj.getMonth();
    const reportYear = dateObj.getFullYear();

    let totalAmount = 0;
    let fraudCount = 0;
    records.forEach(r => {
        const amount = parseFloat(r.Transaction_Amount || r.Monto) || 0;
        const fraud = (r.Fraud_Flag === 'Yes' || r.Fraud_Flag === 1 || r.Es_Fraude === 'Yes' || r.Es_Fraude === 1);
        totalAmount += amount;
        if (fraud) fraudCount++;
    });

    analysisResult = { monthIndex: reportMonth, year: reportYear, count: records.length, totalAmount, fraudCount };
    await checkDuplicatesInFirebase(reportMonth, reportYear);
}

async function checkDuplicatesInFirebase(month, year) {
    uploadCard.style.display = 'none';
    previewContainer.style.display = 'flex';
    previewTitle.textContent = "Verificando...";

    try {
        const dbData = await fetchNodo('etl');
        isDuplicate = false;
        existingIds = [];

        if (dbData) {
            Object.values(dbData).forEach(tx => {
                if (!tx.Fecha_Transaccion) return;
                const d = new Date(tx.Fecha_Transaccion);
                if (d.getMonth() === month && d.getFullYear() === year) {
                    isDuplicate = true;
                    existingIds.push(tx.ID_Transaccion);
                }
            });
        }
        renderPreview(isDuplicate);
    } catch (e) {
        console.error(e);
        renderPreview(false);
    }
}

function renderPreview(duplicate) {
    previewTitle.textContent = `Reporte: ${monthNames[analysisResult.monthIndex]} ${analysisResult.year}`;
    document.getElementById('prevTx').textContent = analysisResult.count.toLocaleString();
    document.getElementById('prevAmount').textContent = "$" + (analysisResult.totalAmount).toLocaleString();
    document.getElementById('prevFraud').textContent = analysisResult.fraudCount;

    if (duplicate) {
        duplicateAlert.style.display = 'flex';
        previewBadge.textContent = 'Actualización';
        previewBadge.style.background = 'var(--warning)';
        btnUpload.classList.add('warning');
        btnUpload.innerHTML = '<i class="fas fa-sync-alt"></i> REEMPLAZAR DATOS';
    } else {
        duplicateAlert.style.display = 'none';
        previewBadge.textContent = 'Nuevo';
        previewBadge.style.background = 'var(--success)';
        btnUpload.classList.remove('warning');
        btnUpload.innerHTML = '<i class="fas fa-rocket"></i> CONFIRMAR Y SUBIR';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EJECUCIÓN CON ANIMACIÓN (EL FIX VISUAL)
// ═══════════════════════════════════════════════════════════════════════════

btnUpload.addEventListener('click', async () => {
    btnUpload.disabled = true;
    btnClosePreview.disabled = true;

    // Cambiar vista
    previewContainer.style.display = 'none';
    processCard.style.display = 'block'; // Forzar display
    processCard.classList.add('active'); // Activar animación

    // Si es duplicado, hacemos el paso de borrado primero
    if (isDuplicate) {
        await simulateStep(stepDelete, "Eliminando registros antiguos...", 15);
        await deleteExistingRecords(); // Llamada real
        completeStepUI(stepDelete);
    }

    await executeUploadPipeline();
});

// Función auxiliar para pausas visuales
const delay = ms => new Promise(res => setTimeout(res, ms));

async function executeUploadPipeline() {
    try {
        // PASO 1: INGESTA
        activateStepUI(1);
        updateStatus("Subiendo dataset original...", 25);
        await delay(1000); // Pausa visual para que se vea la barra
        await updateNodoLotes('original', parsedData); // Subida real
        updateStatus("Ingesta completada", 35);
        completeStepUI(1);
        await delay(500);

        // PASO 2: ETL
        activateStepUI(2);
        updateStatus("Ejecutando limpieza y normalización...", 50);
        await delay(1200); // El usuario "siente" que está procesando

        const cleanedArray = ejecutarLimpieza(parsedData);
        const cleanedObj = {};
        cleanedArray.forEach(reg => cleanedObj[reg.ID_Transaccion] = reg);
        await updateNodoLotes('etl', cleanedObj); // Subida real ETL

        updateStatus("Datos limpios guardados", 65);
        completeStepUI(2);
        await delay(500);

        // PASO 3: TRANSFORMACIÓN IA
        activateStepUI(3);
        updateStatus("Preparando vectores para IA...", 80);
        await delay(1500); // Un poco más largo para dar peso a la "IA"

        const transformedArray = ejecutarTransformacion(cleanedArray);
        const transformedObj = {};
        cleanedArray.forEach((reg, index) => {
            transformedObj[reg.ID_Transaccion] = transformedArray[index];
        });
        await updateNodoLotes('transformado', transformedObj);

        updateStatus("Finalizando...", 95);
        completeStepUI(3);
        await delay(800);

        // FIN
        updateStatus("¡Carga Exitosa!", 100);
        globalProgress.style.background = 'var(--success)';

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        setTimeout(() => {
            alert('Proceso finalizado correctamente.');
            window.location.href = '../reports/index.html';
        }, 500);

    } catch (e) {
        console.error(e);
        updateStatus("Error: " + e.message, 0);
        globalProgress.style.background = 'var(--error)';
        alert("Ocurrió un error. Revisa la consola.");
        location.reload();
    }
}

async function deleteExistingRecords() {
    // Simplemente ejecutamos el borrado real
    const deletePromises = existingIds.map(id => {
        const url = `${firebaseConfig.databaseURL}${firebaseConfig.nodos.etl}/${id}.json`;
        return fetch(url, { method: 'DELETE' });
    });
    await Promise.all(deletePromises);
}

// Helpers de UI
function resetSelection() {
    selectedFile = null; parsedData = null; fileInput.value = '';
    uploadCard.style.display = 'block';
    previewContainer.style.display = 'none';
    duplicateAlert.style.display = 'none';
}

function activateStepUI(num) {
    // Reset visual
    Object.values(steps).forEach(s => s.classList.remove('active'));
    // Activar actual
    steps[num].classList.remove('pending');
    steps[num].classList.add('active');
}

function completeStepUI(stepElementOrNum) {
    const el = (typeof stepElementOrNum === 'number') ? steps[stepElementOrNum] : stepElementOrNum;
    el.classList.remove('active');
    el.classList.add('done');
}

async function simulateStep(el, text, targetPercent) {
    el.style.display = 'flex';
    el.classList.add('active');
    updateStatus(text, targetPercent);
    await delay(1000);
}

function updateStatus(text, percent) {
    statusText.textContent = text;
    globalProgress.style.width = `${percent}%`;
}