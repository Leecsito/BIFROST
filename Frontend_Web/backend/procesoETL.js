// ═══════════════════════════════════════════════════════════════════════════
// BACKEND: procesoETL.js
// Responsabilidad: SOLO ETL (Extracción, Transformación, Limpieza)
// NO CONTIENE LÓGICA DE PREDICCIÓN
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// UTILIDAD: LEER CSV
// ─────────────────────────────────────────────────────────────────────────
function procesarCSVTexto(csvText) {
    const lineas = csvText.trim().split('\n');
    const headers = lineas[0].split(',').map(h => h.trim());
    const resultado = {};

    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;

        const valores = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};

        headers.forEach((h, index) => {
            let val = valores[index] ? valores[index].trim().replace(/^"|"$/g, '') : '';
            obj[h] = val;
        });

        const id = obj['Transaction_ID'] || obj['ID_Transaccion'] || `NEW-${Date.now()}-${i}`;
        resultado[id] = obj;
    }

    return resultado;
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 2 y 3: LIMPIEZA Y SELECCIÓN
// ─────────────────────────────────────────────────────────────────────────
function ejecutarLimpieza(datosSucios) {
    let registros = [];

    // Estandarizar entrada
    if (Array.isArray(datosSucios)) {
        registros = datosSucios;
    } else {
        registros = Object.entries(datosSucios).map(([key, value]) => ({
            ID_Transaccion: key,
            ...value
        }));
    }

    console.log(`📦 Procesando lote de: ${registros.length} registros`);

    // Mapeo de columnas (Inglés -> Español)
    const mapa = {
        'Transaction_ID': 'ID_Transaccion',
        'Transaction_Amount': 'Monto',
        'Transaction_Date': 'Fecha_Transaccion',
        'Transaction_Type': 'Tipo_Transaccion',
        'Account_Balance': 'Saldo_Cuenta',
        'Fraud_Flag': 'Es_Fraude',
        'Customer_Age': 'Edad_Cliente',
        'Customer_Income': 'Ingresos',
        'Merchant_Name': 'Comercio',
        'Category': 'Categoria',
        'City': 'Ciudad',
        'Customer_Gender': 'Genero',
        'Payment_Method': 'Metodo_Pago'
    };

    let df = registros.map(reg => {
        const nuevo = { ...reg };
        Object.keys(mapa).forEach(k => {
            if (reg[k] !== undefined) nuevo[mapa[k]] = reg[k];
        });
        return nuevo;
    });

    // Eliminar duplicados
    const unicosMap = new Map();
    df.forEach(reg => {
        if (reg.ID_Transaccion) unicosMap.set(reg.ID_Transaccion, reg);
    });

    // Filtrar y limpiar
    return Array.from(unicosMap.values())
        .filter(reg => {
            const edad = parseInt(reg.Edad_Cliente);
            const monto = parseFloat(reg.Monto);
            return !isNaN(edad) && edad >= 18 && !isNaN(monto) && monto >= 0;
        })
        .map(reg => ({
            ID_Transaccion: reg.ID_Transaccion,
            Monto: parseFloat(reg.Monto) || 0,
            Tipo_Transaccion: reg.Tipo_Transaccion || "N/A",
            Saldo_Cuenta: parseFloat(reg.Saldo_Cuenta) || 0,
            Es_Fraude: reg.Es_Fraude || "No",
            Categoria: reg.Categoria || "Varios",
            Ciudad: reg.Ciudad || "Desconocido",
            Edad_Cliente: parseInt(reg.Edad_Cliente) || 0,
            Genero: reg.Genero || "N/A",
            Ingresos: parseFloat(reg.Ingresos) || 0,
            Comercio: reg.Comercio || "N/A",
            Fecha_Transaccion: reg.Fecha_Transaccion
        }));
}

// ─────────────────────────────────────────────────────────────────────────
// FASE 4: TRANSFORMACIÓN (NORMALIZACIÓN)
// ─────────────────────────────────────────────────────────────────────────
function ejecutarTransformacion(datosLimpios) {
    return datosLimpios.map(reg => {
        const fecha = new Date(reg.Fecha_Transaccion);
        const horaDia = fecha.getHours();
        const diaSemana = fecha.getDay();

        return {
            Monto_Norm: (parseFloat(reg.Monto) || 0) / 10000,
            Saldo_Norm: (parseFloat(reg.Saldo_Cuenta) || 0) / 100000,
            Edad_Norm: (parseInt(reg.Edad_Cliente) || 0) / 100,
            Ingresos_Norm: (parseFloat(reg.Ingresos) || 0) / 200000,
            Hora_Dia: isNaN(horaDia) ? 0 : horaDia / 23,
            Dia_Semana: isNaN(diaSemana) ? 0 : diaSemana / 6,
            Es_Fraude_Num: reg.Es_Fraude === "Yes" ? 1 : 0,
            Categoria: reg.Categoria,
            Tipo_Transaccion: reg.Tipo_Transaccion
        };
    });
}