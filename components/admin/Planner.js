'use client';
import { useState } from 'react';
import { Page } from './kit';
import CalendarPanel from './Calendar';
import Todo from './Todo';
// One page for everything with a date: classes, workshops, your own events and to-dos, with the to-do list below the calendar.
export default function Planner() {
  const [version, setVersion] = useState(0);
  return (<Page title="Planner"><CalendarPanel version={version} /><Todo embedded onChanged={() => setVersion((v) => v + 1)} /></Page>);
}
