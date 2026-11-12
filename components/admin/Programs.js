'use client';
import Seg, { useTab } from './Seg';
import Workshops from './Workshops';
import Classes from './Classes';
const OPTIONS = [['workshops', 'Workshops'], ['classes', 'Classes']];
export default function Programs() {
  const [tab, setTab] = useTab(OPTIONS, 'workshops');
  return (<div className="ad-page"><div style={{ textAlign: 'center' }}><Seg options={OPTIONS} value={tab} onChange={setTab} label="Programs" /></div>{tab === 'workshops' ? <Workshops /> : <Classes />}</div>);
}
