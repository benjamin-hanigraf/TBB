'use client';
import Seg, { useTab } from './Seg';
import Money from './Money';
import InvoiceTool from './InvoiceTool';
import Calculator from './Calculator';
const OPTIONS = [['accounts', 'Accounts'], ['invoices', 'Invoices'], ['calculator', 'Calculator']];
export default function MoneyHub() {
  const [tab, setTab] = useTab(OPTIONS, 'accounts');
  return (<div className="ad-page"><div style={{ textAlign: 'center' }}><Seg options={OPTIONS} value={tab} onChange={setTab} label="Money" /></div>{tab === 'accounts' ? <Money /> : tab === 'invoices' ? <InvoiceTool /> : <Calculator />}</div>);
}
