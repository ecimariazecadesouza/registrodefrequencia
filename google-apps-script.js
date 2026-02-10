/**
 * SISTEMA DE FREQUÊNCIA ESCOLAR - GOOGLE APPS SCRIPT
 * Versão: 2.1 (Correção de Duplicação e Preservação de Dados)
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
                // Evita duplicação limpando a aba antes de salvar o lote completo do App
                if (data.attendance) updateSheet(ss, 'Frequencia', data.attendance);
                return createResponse({ success: true, message: 'Sincronização completa realizada' });

            case 'saveAttendance':
                saveRecord(ss, 'Frequencia', data.record, ['studentId', 'date', 'lessonIndex']);
                return createResponse({ success: true, message: 'Presença salva individualmente' });

            case 'saveBatchAttendance':
                saveBatchAttendance(ss, data.records);
                return createResponse({ success: true, message: 'Lote de presença salvo' });

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
            // Tratamento consistente para datas
            if (val instanceof Date) {
                val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            }

            // Converte strings JSON de volta para objeto (ex: schedule)
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
            const val = item[header];
            // Salva objetos como strings JSON
            return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val === undefined ? '' : val);
        }));
    });

    sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function saveBatchAttendance(ss, records) {
    const sheet = ss.getSheetByName('Frequencia');
    if (!sheet) return;
    records.forEach(record => {
        saveRecord(ss, 'Frequencia', record, ['studentId', 'date', 'lessonIndex']);
    });
}

function saveRecord(ss, sheetName, record, keys) {
    const sheet = ss.getSheetByName(sheetName);
    const dataRows = sheet.getDataRange().getValues();
    const headers = dataRows[0];
    const data = dataRows.slice(1);

    const keyIndices = keys.map(k => headers.indexOf(k));

    // Procura linha existente tratando formatos de data
    const rowIndex = data.findIndex(row =>
        keys.every((k, i) => {
            let cellVal = row[keyIndices[i]];
            if (cellVal instanceof Date) {
                cellVal = Utilities.formatDate(cellVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            }
            return String(cellVal) === String(record[k]);
        })
    );

    if (rowIndex >= 0) {
        const rowNum = rowIndex + 2;
        Object.keys(record).forEach(k => {
            const colIdx = headers.indexOf(k);
            if (colIdx >= 0) {
                let val = record[k];
                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                sheet.getRange(rowNum, colIdx + 1).setValue(val);
            }
        });
    } else {
        sheet.appendRow(headers.map(h => {
            let val = record[h];
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
        if (!ss.getSheetByName(name)) {
            const sheet = ss.insertSheet(name);
            sheet.appendRow(sheets[name]);
        }
    });
}

function setup() {
    const ss = getSS();
    checkSetup(ss);
    Logger.log('Configuração v2.1 concluída!');
}
