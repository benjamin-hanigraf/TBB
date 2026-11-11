'use client';
import { useRef, useState } from 'react';
import { sb, Modal, Btn, download, useToast } from './kit';
import { parseCSV, toObjects, writeCSV } from '@/lib/csv';
import { SPECS, readSheet } from '@/lib/importSpecs';

/** Upload a spreadsheet (CSV) to add many rows at once. Rows with the same Code (or email) are updated instead of duplicated. */
export default function ImportCsv({ kind, onClose, onDone }) {
  const spec = SPECS[kind]; const toast = useToast(); const file = useRef(); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null); const [err, setErr] = useState('');
  const parsed = text.trim() ? readSheet(spec, toObjects(parseCSV(text))) : null;
  const template = () => download(spec.file, writeCSV(spec.columns.map((c) => c.label), spec.columns.map((c) => c.ex)));
  async function load(e) { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { setText(await f.text()); setDone(null); setErr(''); } catch { setErr('Could not read that file.'); } }
  async function save() {
    if (!parsed?.rows.length) return; setBusy(true); setErr('');
    try {
      for (let i = 0; i < parsed.rows.length; i += 100) {
        const chunk = parsed.rows.slice(i, i + 100); const keyed = chunk.filter((r) => r[spec.onConflict]), plain = chunk.filter((r) => !r[spec.onConflict]);
        if (keyed.length) { const { error } = await sb().from(spec.table).upsert(keyed, { onConflict: spec.onConflict }); if (error) throw error; }
        if (plain.length) { const { error } = await sb().from(spec.table).insert(plain); if (error) throw error; }
      }
      setDone(parsed.rows.length); toast(`${parsed.rows.length} ${spec.title} saved`); onDone?.();
    } catch (e) { setErr(e.message || 'Could not save. Nothing after the failed row was saved.'); } finally { setBusy(false); }
  }
  return (<Modal title={`Add many ${spec.title} from a spreadsheet`} onClose={onClose} wide>
    {done ? (<div className="center" style={{ padding: '24px 0' }}><p style={{ fontSize: 20, fontWeight: 600 }}>{done} {spec.title} saved.</p><p className="ad-help">Anything with the same {spec.onConflict === 'email' ? 'email' : 'code'} was updated instead of added twice.</p><div className="ad-actions" style={{ justifyContent: 'center' }}><Btn onClick={onClose}>Done</Btn></div></div>) : (<>
      <ol className="ad-steps"><li><b>Download the template</b> and open it in Excel, Numbers or Google Sheets.<div style={{ marginTop: 8 }}><Btn variant="ghost" className="ad-btn ghost sm" icon="fileout" onClick={template}>Template</Btn></div></li>
        <li><b>Fill one {spec.noun} per row.</b> Columns marked * are required. Keep the first row as it is.</li>
        <li><b>Save it as CSV</b> and choose the file below. You can also paste rows straight from your spreadsheet.<div style={{ marginTop: 8 }}><input ref={file} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={load} /><Btn variant="ghost" className="ad-btn ghost sm" icon="filein" onClick={() => file.current.click()}>Choose file</Btn></div></li></ol>
      <details className="ad-details"><summary>What goes in each column</summary><div className="ad-scroll"><table className="ad-table"><thead><tr><th>Column</th><th>Example</th><th>Notes</th></tr></thead><tbody>{spec.columns.map((c) => <tr key={c.label}><td>{c.label}{c.req ? ' *' : ''}</td><td>{c.ex || '(empty)'}</td><td>{c.hint}</td></tr>)}</tbody></table></div></details>
      <label className="ad-field" style={{ marginTop: 14 }}><span>Or paste rows here <em>(including the first heading row)</em></span><textarea value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} rows={4} placeholder="Name,Price,In stock&#10;Wooden holder,1000,5" /></label>
      {parsed && (<div style={{ marginTop: 16 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{parsed.rows.length} ready to save{parsed.errors.length ? `, ${parsed.errors.length} with problems` : ''}</p>
        {parsed.rows.slice(0, 5).map((r, i) => <p key={i} className="ad-help" style={{ margin: '3px 0' }}>✓ {spec.show(r)}</p>)}{parsed.rows.length > 5 && <p className="ad-help">…and {parsed.rows.length - 5} more</p>}
        {parsed.errors.slice(0, 8).map((e, i) => <p key={i} className="ad-help" style={{ margin: '3px 0', color: '#9b1c1c' }}>✗ Row {e.line}: {e.message}</p>)}{parsed.errors.length > 8 && <p className="ad-help" style={{ color: '#9b1c1c' }}>…and {parsed.errors.length - 8} more rows with problems</p>}
        {parsed.errors.length > 0 && parsed.rows.length > 0 && <p className="ad-help">Rows with problems are skipped. Fix them in your sheet and import again, or continue with the good ones.</p>}</div>)}
      {err && <p className="ad-err" role="alert" style={{ marginTop: 12 }}>{err}</p>}
      <div className="ad-actions full" style={{ marginTop: 16 }}><Btn busy={busy} disabled={!parsed?.rows.length} icon="filein" onClick={save}>{parsed?.rows.length ? `Save ${parsed.rows.length} ${parsed.rows.length === 1 ? spec.noun : spec.title}` : 'Save'}</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></>)}
  </Modal>);
}
