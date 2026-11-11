import Form from '@/components/Form';
export const metadata = { title: 'Our Services' };
export default function Services() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Our services</p><h1>Tell us what you need.<br />We will get it done.</h1>
      <p className="lead">Share what you would like us to customise, and we will call you soon.</p></div></section>
    <section className="section"><div className="wrap">
      <Form kind="service" submit="Send" done="Thanks for submitting. We will call you soon." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'customise', label: 'Customise for', type: 'select', required: true, options: ['Invitations', 'Stationery', 'Calligraphy artwork', 'Gifts', 'Something else'] },
        { name: 'message', label: 'What would you like us to customise?', type: 'textarea', required: true }]} /></div></section>
  </main>);
}
