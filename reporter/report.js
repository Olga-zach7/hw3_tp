const fs = require('fs');
const { parse } = require('csv-parse/sync');

const input = fs.readFileSync('/data/data.csv', 'utf8');
const records = parse(input, { columns: true, skip_empty_lines: true });

if (records.length === 0) {
  console.error('CSV пустой');
  process.exit(1);
}

const columns = Object.keys(records[0]);

const numericStats = {};
const categoricalStats = {};

for (const col of columns) {
  const rawValues = records.map(r => r[col]);
  const numericValues = rawValues.map(v => parseFloat(v)).filter(v => !isNaN(v));

  if (numericValues.length === rawValues.length) {
    // Все значения числовые
    numericStats[col] = {
      count: numericValues.length,
      min: Math.min(...numericValues).toFixed(2),
      max: Math.max(...numericValues).toFixed(2),
      mean: (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2),
    };
  } else {

    const freq = {};
    for (const v of rawValues) {
      freq[v] = (freq[v] || 0) + 1;
    }
    categoricalStats[col] = freq;
  }
}

const numericRows = Object.entries(numericStats).map(([col, s]) => `
  <tr>
    <td>${col}</td>
    <td>${s.count}</td>
    <td>${s.min}</td>
    <td>${s.max}</td>
    <td>${s.mean}</td>
  </tr>`).join('');

const numericTable = `
  <h2>Числовые колонки</h2>
  <table>
    <thead>
      <tr><th>Колонка</th><th>Кол-во</th><th>Min</th><th>Max</th><th>Среднее</th></tr>
    </thead>
    <tbody>${numericRows || '<tr><td colspan="5">Нет числовых колонок</td></tr>'}</tbody>
  </table>`;

const categoricalTables = Object.entries(categoricalStats).map(([col, freq]) => {
  const freqRows = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([val, cnt]) => `<tr><td>${val}</td><td>${cnt}</td></tr>`)
    .join('');
  return `
  <h2>Колонка: ${col}</h2>
  <table>
    <thead><tr><th>Значение</th><th>Кол-во</th></tr></thead>
    <tbody>${freqRows}</tbody>
  </table>`;
}).join('');


const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Отчёт</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; max-width: 900px; margin: auto; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Отчёт по данным</h1>
  <p>Всего строк: <strong>${records.length}</strong></p>
  ${numericTable}
  ${categoricalTables}
</body>
</html>`;

fs.writeFileSync('/data/report.html', html);
console.log('Отчёт сохранён: /data/report.html');