import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export default async function Admin() {
  // Opt into dynamic rendering
  await connection();
  
  redirect('/admin/users');

  return <div>
    test
  </div>
}