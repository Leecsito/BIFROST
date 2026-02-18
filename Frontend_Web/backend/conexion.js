const firebaseConfig = {
    databaseURL: "https://bifrost-v2-d56a5-default-rtdb.firebaseio.com/",
    nodos: {
        original: "USA_Banking_Transactions_Dataset",
        etl: "Dataset_ETL_Limpio",
        transformado: "Dataset_Transformado",
        prediccion: "Dataset_Prediccion_2023"
    }
};

// 1. OBTENER DATOS
async function fetchNodo(nodoKey) {
    const url = `${firebaseConfig.databaseURL}${firebaseConfig.nodos[nodoKey]}.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
}

// 2. SUBIR/ACTUALIZAR DATOS (PATCH)
async function updateNodoLotes(nodoKey, datos) {
    const url = `${firebaseConfig.databaseURL}${firebaseConfig.nodos[nodoKey]}.json`;
    const TAMANO_LOTE = 500;
    const registros = Object.entries(datos);

    for (let i = 0; i < registros.length; i += TAMANO_LOTE) {
        const lote = Object.fromEntries(registros.slice(i, i + TAMANO_LOTE));

        await fetch(url, {
            method: 'PATCH',
            body: JSON.stringify(lote),
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return true;
}

// 3. BORRAR DATOS
async function deleteNodo(nodoKey) {
    const url = `${firebaseConfig.databaseURL}${firebaseConfig.nodos[nodoKey]}.json`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
}