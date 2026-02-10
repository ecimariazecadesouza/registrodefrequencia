/**
 * SISTEMA DE FREQUÊNCIA ESCOLAR - GOOGLE APPS SCRIPT
 * Versão: 2.3 (Performance + Migração de Colunas)
 * 
 * NOVIDADES:
 * - Adiciona automaticamente colunas faltantes ("subject", "notes") em planilhas antigas.
 * - Salva chamadas em lote (Batch) muito mais rápido.
 */

const SPREADSHEET_ID = ''; // Deixe vazio para usar a planilha atual

function getSS() {
    if (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
        return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
    const action = e.parameter.action;
    const ss = getSS();
    checkSetup(ss);

    try {
        if (action === 'getData') {
            return createResponse({
                classes: getSheetData(ss, 'Turmas'),
                students: getSheetData(ss, 'Protagonistas'),
                attendance: getSheetData(ss, 'Frequencia'),
                bimesters: getSheetData(ss, 'Bimestres'),
                holidays: getSheetData(ss, 'Feriados')
            });
        }
        return createResponse({ error: 'Ação inválida: ' + action }, 400);
    } catch (error) {
        return createResponse({ error: error.toString() }, 500);
    }
}

function doPost(e) {
    const ss = getSS();
    checkSetup(ss);

    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        switch (action) {
            case 'saveAll':
                if (data.classes) updateSheet(ss, 'Turmas', data.classes);
                if (data.students) updateSheet(ss, 'Protagonistas', data.students);
                if (data.bimesters) updateSheet(ss, 'Bimestres', data.bimesters);
                if (data.holidays) updateSheet(ss, 'Feriados', data.holidays);
                if (data.attendance) updateSheet(ss, 'Frequencia', data.attendance);
                return createResponse({ success: true, message: 'Sincronização completa realizada' });

            case 'saveAttendance':
                saveRecord(ss, 'Frequencia', data.record, ['studentId', 'date', 'lessonIndex']);
                return createResponse({ success: true, message: 'Presença salva individualmente' });

            case 'saveBatchAttendance':
                saveBatchAttendance(ss, data.records);
                return createResponse({ success: true, message: 'Lote de presença salvo com sucesso' });

            default:
                return createResponse({ error: 'Ação inválida: ' + action }, 400);
        }
    } catch (error) {
        return createResponse({ error: error.toString() }, 500);
    }
}

function getSheetData(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0];
    return values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            let val = row[i];
            // Normaliza datas
            if (val instanceof Date) {
                val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            } else if (typeof val === 'string' && val.includes('T') && val.length > 10) {
                val = val.substring(0, 10);
            }

            if (header === 'schedule' && typeof val === 'string' && val.startsWith('{')) {
                try { val = JSON.parse(val); } catch (e) { }
            }
            obj[header] = val;
        });
        return obj;
    });
}

function updateSheet(ss, sheetName, data) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    } else {
        sheet.clear();
    }

    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const values = [headers];

    data.forEach(item => {
        values.push(headers.map(header => {
            let val = item[header];
            if (header === 'date' && typeof val === 'string') {
                val = val.substring(0, 10);
            }
            return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val === undefined ? '' : val);
        }));
    });

    sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

/**
 * Versão OTIMIZADA para salvar vários registros de uma vez.
 * Lê a planilha apenas uma vez, prepara as linhas novas e insere em lote.
 */
function saveBatchAttendance(ss, records) {
    const sheet = ss.getSheetByName('Frequencia');
    if (!sheet) return;

    // 1. Ler dados existentes para verificar duplicatas
    const range = sheet.getDataRange();
    const values = range.getValues();
    const headers = values[0]; // Assume que sempre tem cabeçalho pois checkSetup garante

    // Mapeia índices das colunas para acesso rápido
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);

    // Verifica se colunas chaves existem
    const keys = ['studentId', 'date', 'lessonIndex'];
    if (!keys.every(k => colMap.hasOwnProperty(k))) {
        throw new Error("Colunas chave faltando na planilha Frequencia");
    }

    // Cria mapa de chaves existentes para lookup rápido: "studentId|date|lessonIndex" -> rowIndex (0-based da matriz values)
    const existingMap = new Map();
    values.slice(1).forEach((row, idx) => {
        const sId = String(row[colMap['studentId']]);

        let dVal = row[colMap['date']];
        if (dVal instanceof Date) dVal = Utilities.formatDate(dVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        else if (typeof dVal === 'string') dVal = dVal.substring(0, 10);
        const dateStr = String(dVal);

        const lIdx = String(row[colMap['lessonIndex']]);

        const key = `${sId}|${dateStr}|${lIdx}`;
        existingMap.set(key, idx + 1); // +1 pq slice cortou o header, então row[0] do slice é row[1] da sheet? Não.
        // Sheet rows são 1-based.
        // headers é row 1.
        // values[1] é row 2.
        // idx=0 (primeiro do slice) é row 2.
        // Então rowNum = idx + 2.
        existingMap.set(key, idx + 2);
    });

    const newRows = [];
    const updates = [];

    records.forEach(record => {
        const rSid = String(record.studentId);
        let rDate = String(record.date).substring(0, 10);
        const rLidx = String(record.lessonIndex);

        const key = `${rSid}|${rDate}|${rLidx}`;

        const rowNum = existingMap.get(key);

        if (rowNum) {
            // Atualização: guarda infos para atualizar célula a célula (lento mas seguro para updates esparsos)
            // Ou melhor, atualiza o array em memória e reescreve tudo? Não, muito arriscado reescrever tudo.
            // Updates de frequência são raros em batch. Geralmente batch é INSERT.
            // Para garantir performance, vamos fazer `setValue` apenas se realmente mudou?
            // Vamos simplificar: se existe, atualiza as colunas que vieram.
            Object.keys(record).forEach(field => {
                if (colMap.hasOwnProperty(field)) {
                    // Adiciona na lista de updates pontuais
                    let val = record[field];
                    if (field === 'date' && typeof val === 'string') val = val.substring(0, 10);
                    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);

                    updates.push({
                        row: rowNum,
                        col: colMap[field] + 1, // 1-based
                        val: val
                    });
                }
            });
        } else {
            // Novo registro: prepara linha para append em lote
            const newRow = headers.map(h => {
                let val = record[h];
                if (h === 'date' && typeof val === 'string') val = val.substring(0, 10);
                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                return val !== undefined ? val : '';
            });
            newRows.push(newRow);
        }
    });

    // 2. Aplica Updates (se houver)
    if (updates.length > 0) {
        // Agrupar updates é complexo no GAS. Vamos fazer um a um. 
        // Se houver MUITOS updates, isso vai demorar. Mas a expectativa é que seja raro.
        updates.forEach(u => {
            sheet.getRange(u.row, u.col).setValue(u.val);
        });
    }

    // 3. Aplica Inserts (Lote)
    if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
    }

    // Força flush
    SpreadsheetApp.flush();
}

/**
 * Função legado para manter compatibilidade caso seja chamada diretamente,
 * mas agora usa a lógica de saveBatchAttendance se possível ou similar.
 * A original fazia append one-by-one. Mantida apenas para 'saveAttendance' (singular).
 */
function saveRecord(ss, sheetName, record, keys) {
    const sheet = ss.getSheetByName(sheetName);
    const dataRows = sheet.getDataRange().getValues();
    const headers = dataRows[0];
    const data = dataRows.slice(1);

    const keyIndices = keys.map(k => headers.indexOf(k));

    const rowIndex = data.findIndex(row =>
        keys.every((k, i) => {
            let cellVal = row[keyIndices[i]];
            if (cellVal instanceof Date) {
                cellVal = Utilities.formatDate(cellVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            }
            let recordVal = String(record[k]);
            if (k === 'date') return String(cellVal).substring(0, 10) === recordVal.substring(0, 10);
            return String(cellVal) === recordVal;
        })
    );

    if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        Object.keys(record).forEach(k => {
            const colIdx = headers.indexOf(k);
            if (colIdx >= 0) {
                let val = record[k];
                if (k === 'date' && typeof val === 'string') val = val.substring(0, 10);
                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                sheet.getRange(rowNum, colIdx + 1).setValue(val);
            }
        });
    } else {
        sheet.appendRow(headers.map(h => {
            let val = record[h];
            if (h === 'date' && typeof val === 'string') val = val.substring(0, 10);
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            return val !== undefined ? val : '';
        }));
    }
}

function createResponse(data, status = 200) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function checkSetup(ss) {
    const sheets = {
        'Turmas': ['id', 'name', 'year', 'period', 'lessonsPerDay', 'schedule', 'createdAt'],
        'Protagonistas': ['id', 'name', 'registration', 'classId', 'situation', 'createdAt'],
        'Frequencia': ['id', 'studentId', 'date', 'lessonIndex', 'status', 'subject', 'notes'],
        'Bimestres': ['id', 'name', 'start', 'end'],
        'Feriados': ['id', 'date', 'description', 'type']
    };

    Object.keys(sheets).forEach(name => {
        let sheet = ss.getSheetByName(name);
        if (!sheet) {
            sheet = ss.insertSheet(name);
            sheet.appendRow(sheets[name]);
        } else {
            // Verifica colunas faltantes e adiciona!
            const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
            const desiredHeaders = sheets[name];
            const missing = desiredHeaders.filter(h => !headers.includes(h));

            if (missing.length > 0) {
                const startCol = headers.length + 1;
                // Adiciona os novos headers
                sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
            }
        }
    });
}
