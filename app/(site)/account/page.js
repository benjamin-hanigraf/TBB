import Account from '@/components/Account';
export const metadata = { title: 'Account' };
export default function AccountPage() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Members</p><h1>Your account</h1>
      <p className="lead">Log in to see your bookings and orders, and to save your details for faster checkout.</p></div></section>
    <section className="section"><div className="wrap" style={{ maxWidth: 640 }}><Account /></div></section>
  </main>);
}
