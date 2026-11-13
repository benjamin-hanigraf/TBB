'use client';
import { useState } from 'react';
import { Page, Btn } from './kit';
import CalendarPanel, { PlanForm, PlanView } from './Calendar';
import Todo from './Todo';
import { todayISO } from '@/lib/accounting';
// One page for everything with a date: classes, workshops, your own events, rent-outs and tasks, with the task list below the calendar.
export default function Planner() {
  const today = todayISO(); const [version, setVersion] = useState(0); const [ym, setYm] = useState(today.slice(0, 7)); const [sel, setSel] = useState(today);
  const [view, setView] = useState(null); const [form, setForm] = useState(null);          // view: an item being read; form: adding or editing
  const done = () => { setForm(null); setView(null); setVersion((v) => v + 1); };
  return (<Page title="Planner" action={<><Btn variant="ghost" onClick={() => { setYm(today.slice(0, 7)); setSel(today); }}>Today</Btn><Btn icon="plus" onClick={() => setForm({ item: { on_date: sel } })}>Add</Btn></>}>
    <CalendarPanel version={version} ym={ym} setYm={setYm} sel={sel} setSel={setSel} onOpen={(item, kind) => setView({ item, kind })} />
    <Todo embedded onChanged={() => setVersion((v) => v + 1)} />
    {view && <PlanView kind={view.kind} item={view.item} onClose={() => setView(null)} onEdit={() => { setForm({ item: view.item, kind: view.kind }); setView(null); }} />}
    {form && <PlanForm kind={form.kind} item={form.item} onClose={() => setForm(null)} onSaved={done} />}
  </Page>);
}
