import { connection } from 'next/server';
import { AdminCapsulesPage } from '@/components/admin-capsule';

export default async function AdminCapsules() {
  // Opt into dynamic rendering
  await connection();
  
  return <AdminCapsulesPage />;
}