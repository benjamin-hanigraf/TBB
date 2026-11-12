'use client';
import Seg, { useTab } from './Seg';
import Orders from './Orders';
import Labels from './Labels';
const OPTIONS = [['orders', 'Orders'], ['labels', 'Label printer']];
export default function OrdersHub() {
  const [tab, setTab] = useTab(OPTIONS, 'orders');
  return (<div className="ad-page"><div style={{ textAlign: 'center' }} className="ad-noprint"><Seg options={OPTIONS} value={tab} onChange={setTab} label="Orders" /></div>{tab === 'orders' ? <Orders /> : <Labels />}</div>);
}
