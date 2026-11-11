import { collaborators, business, img } from '@/lib/data';
export const metadata = { title: 'Collaborations' };
export default function Collabs() {
  return (<main>
    <section className="pagehead"><div className="wrap center"><p className="eyebrow">We have worked with</p><h1>Collaborations.</h1>
      <p className="lead">We have worked on different projects over the years with different organisations. If there is one thing we love about these collaborations, it is the process of getting to know people, creating art and sharing the joy that it gives.</p></div></section>
    <section className="section" style={{paddingTop:24}}><div className="wrap">
      <div className="logos">{collaborators.map(c=><div key={c.name}><img src={c.img} alt={c.name} loading="lazy" /></div>)}</div></div></section>
    <section className="section soft"><div className="wrap split"><div className="ph"><img src={img('b6a47a5a0d')} alt="Student with artwork" /></div>
      <div><p className="eyebrow">Teach For India</p><h2>These kids will make you wish you never grew up.</h2><p className="lead">We had a fun time teaching art to a wonderful class in collaboration with Teach For India.</p></div></div></section>
    <section className="section"><div className="wrap"><p className="eyebrow">Are you an artist? A brand? An NGO? A company?</p><h2>We would love to collaborate with you.</h2>
      <p className="lead">Let us know what you have in mind.</p>
      <form><label>Name<input name="name" /></label><label>Email<input type="email" name="email" /></label><label>Your idea<textarea name="message" /></label><button className="btn" disabled>Send (forms go live soon)</button></form></div></section>
  </main>);
}
