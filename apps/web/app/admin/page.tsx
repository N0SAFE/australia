import { connection } from 'next/server';
import { AdminDashboardClient } from './admin-dashboard-client';

export default async function Admin() {
  // Opt into dynamic rendering
  await connection();

  return <AdminDashboardClient />;
}