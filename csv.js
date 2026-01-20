document.getElementById('csvFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const rows = parseCSV(reader.result);
        renderTable(rows);
    };
    reader.readAsText(file, 'utf-8');
});

/* CSV 안전 파싱 */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && next === '"') {
            value += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (value || row.length) {
                row.push(value);
                rows.push(row);
                row = [];
                value = '';
            }
        } else {
            value += char;
        }
    }
    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }
    return rows;
}

/* HTML 표로 출력 */
function renderTable(rows) {
    let html = '<table>';

    rows.forEach((row, rIdx) => {
        html += '<tr>';
        row.forEach(cell => {
            html += rIdx < 2
                ? `<th>${cell || ''}</th>`
                : `<td>${cell || ''}</td>`;
        });
        html += '</tr>';
    });

    html += '</table>';
    document.getElementById('tableArea').innerHTML = html;
}
