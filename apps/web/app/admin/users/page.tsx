import { connection } from 'next/server';
import { AdminUsersPage } from '@/components/admin-user';

export default async function AdminUsers() {
  // Opt into dynamic rendering
  await connection();
  
  return <AdminUsersPage />;
}