/**
 * SISTEMA DE FREQUÊNCIA ESCOLAR - GOOGLE APPS SCRIPT
 * 
 * Este script deve ser colado no Editor de Script da sua Planilha do Google.
 * Ele gerencia o salvamento e a leitura de todos os dados do sistema.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
    const action = e.parameter.action;

    if (action === 'getData') {
        return ContentService.createTextOutput(JSON.stringify(getAllData()))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'saveAttendance') {
        saveAttendance(data.record);
    } else if (action === 'saveBatchAttendance') {
        saveBatchAttendance(data.records);
    } else if (action === 'saveAll') {
        saveAllData(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
}

function getAllData() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    return {
        classes: getSheetData(ss, 'Turmas'),
        students: getSheetData(ss, 'Protagonistas'),
        attendance: getSheetData(ss, 'Frequencia'),
        bimesters: getSheetData(ss, 'Bimestres'),
        holidays: getSheetData(ss, 'Feriados')
    };
}

function getSheetData(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0];
    const data = [];

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const item = {};
        headers.forEach((header, index) => {
            let val = row[index];
            // Handle special data types
            if (val instanceof Date) {
                val = val.toISOString();
            }

            // Parse JSON fields (like schedule)
            if (header === 'schedule' && typeof val === 'string' && val.startsWith('{')) {
                try {
                    val = JSON.parse(val);
                } catch (e) { }
            }

            item[header] = val;
        });
        data.push(item);
    }

    return data;
}

function saveAttendance(record) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Frequencia');

    if (!sheet) {
        sheet = ss.insertSheet('Frequencia');
        sheet.appendRow(['id', 'studentId', 'date', 'lessonIndex', 'status', 'subject', 'notes']);
    }

    const data = sheet.getDataRange().getValues();
    const idValue = record.id;
    let rowIndex = -1;

    // Find existing record by ID
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === idValue) {
            rowIndex = i + 1;
            break;
        }
    }

    const rowData = [
        record.id,
        record.studentId,
        record.date,
        record.lessonIndex,
        record.status,
        record.subject || '',
        record.notes || ''
    ];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
        sheet.appendRow(rowData);
    }
}

function saveBatchAttendance(records) {
    if (!records || records.length === 0) return;
    records.forEach(saveAttendance);
}

function saveAllData(data) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    updateSheet(ss, 'Turmas', ['id', 'name', 'year', 'period', 'lessonsPerDay', 'schedule', 'createdAt'], data.classes);
    updateSheet(ss, 'Protagonistas', ['id', 'name', 'registration', 'classId', 'situation', 'photoUrl', 'createdAt'], data.students);
    updateSheet(ss, 'Bimestres', ['id', 'name', 'start', 'end'], data.bimesters);
    updateSheet(ss, 'Feriados', ['id', 'date', 'description', 'type'], data.holidays);

    if (data.attendance) {
        saveBatchAttendance(data.attendance);
    }
}

function updateSheet(ss, sheetName, headers, data) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    sheet.clear();
    sheet.appendRow(headers);

    if (data && data.length > 0) {
        const rows = data.map(item => headers.map(h => {
            let val = item[h];
            if (typeof val === 'object' && val !== null) {
                return JSON.stringify(val); // Store complex objects as JSON strings
            }
            return val === undefined ? '' : val;
        }));
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
}
