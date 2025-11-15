import { connection } from 'next/server';
import { AdminPresentationClient } from './admin-presentation-client';

export default async function AdminPresentationPage() {
  // Opt into dynamic rendering
  await connection();
  
  return <AdminPresentationClient />;
}
