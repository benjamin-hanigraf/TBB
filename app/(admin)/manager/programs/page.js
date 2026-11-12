import { redirect } from 'next/navigation';
// The old combined page: Workshops and Classes now have their own pages.
export default async function Page({ searchParams }) { const sp = await searchParams; redirect(sp?.tab === 'classes' ? '/manager/classes' : '/manager/workshops'); }
