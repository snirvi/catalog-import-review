import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import sample from '../../samples/catalog.csv?raw';
import './styles.css';

type Issue = { row: number; field: string; message: string };
type Review = { total_rows: number; valid_rows: number; issues: Issue[] };

function downloadReport(issues: Issue[]) {
  const csv = ['line,field,message', ...issues.map(({ row, field, message }) =>
    [row, field, message].map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')
  )].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'catalog-errors.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Review | null>(null);
  const [filename, setFilename] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function validate(content: File | string, name: string) {
    setBusy(true);
    setError('');
    setResult(null);
    setFilter('');
    setFilename(name);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: content,
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        setError(typeof problem?.detail === 'string' ? problem.detail : 'Validation failed. Try again.');
        return;
      }
      setResult(await response.json());
    } catch {
      setError('Could not reach the validation API. Check that the server is running and try again.');
    } finally {
      setBusy(false);
    }
  }

  const invalid = result ? result.total_rows - result.valid_rows : 0;
  const fields = [...new Set(result?.issues.map(issue => issue.field))];
  const visible = result?.issues.filter(issue => !filter || issue.field === filter) ?? [];

  return <main>
    <header>
      <p className="brand">Catalogue tools</p>
      <h1>CSV Import Review</h1>
      <p>Find missing values, duplicate SKUs, and invalid prices before importing a product catalogue.</p>
    </header>
    <section className="panel" aria-labelledby="upload-title">
      <h2 id="upload-title">Review a catalogue</h2>
      <form onSubmit={event => { event.preventDefault(); if (file && !busy) void validate(file, file.name); }}>
        <label htmlFor="file">Catalogue CSV</label>
        <p id="file-hint" className="hint">UTF-8 CSV • up to 1 MiB • columns: sku, name, price</p>
        <input id="file" type="file" accept=".csv,text/csv" aria-describedby="file-hint"
          disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} />
        <div className="actions">
          <button disabled={!file || busy}>Validate CSV</button>
          <button type="button" className="secondary" disabled={busy}
            onClick={() => void validate(sample, 'catalog.csv')}>Try sample CSV</button>
        </div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <p role="status" className="status">{busy ? 'Validating ' + filename + '…' :
      result ? filename + ' reviewed. ' + result.valid_rows + ' valid, ' + invalid + ' need attention.' : ''}</p>
    {result && <section className="panel" aria-labelledby="results-title">
      <h2 id="results-title">Review results</h2>
      <dl className="metrics">
        <div><dt>Total rows</dt><dd>{result.total_rows}</dd></div>
        <div><dt>Valid rows</dt><dd>{result.valid_rows}</dd></div>
        <div><dt>Rows to fix</dt><dd>{invalid}</dd></div>
      </dl>
      {result.issues.length === 0 ? <p className="success">All rows passed validation.</p> : <>
        <p>Fix the issues below in your original CSV, then upload it again.</p>
        <div className="actions controls">
          <label>Filter by field <select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="">All fields</option>
            {fields.map(field => <option key={field}>{field}</option>)}
          </select></label>
          <button className="secondary" onClick={() => downloadReport(result.issues)}>Download error report</button>
        </div>
        <div className="table-wrap">
          <table><caption>{visible.length} issues shown</caption>
            <thead><tr><th scope="col">CSV line</th><th scope="col">Field</th><th scope="col">What to fix</th></tr></thead>
            <tbody>{visible.map(issue => <tr key={issue.row + ':' + issue.field}>
              <td>{issue.row}</td><td>{issue.field}</td><td>{issue.message}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
