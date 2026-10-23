import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SPV')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const res = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.employee_code, u.role, u.is_active, u.created_at,
              creator.full_name AS registered_by_name
       FROM users u
       LEFT JOIN users creator ON u.created_by = creator.id
       ORDER BY u.created_at DESC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only Administrators can register new users' }, { status: 403 });
  }

  try {
    const { username, email, password, full_name, employee_code, role } = await request.json();

    if (!username || !email || !password || !full_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const assignedRole = role === 'SPV' ? 'SPV' : 'TECHNICIAN';
    const hashedPassword = await hashPassword(password);

    const res = await query(
      `INSERT INTO users (username, email, password_hash, full_name, employee_code, role, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, username, email, full_name, employee_code, role, is_active, created_at`,
      [username.trim(), email.trim().toLowerCase(), hashedPassword, full_name.trim(), employee_code?.trim() || null, assignedRole, currentUser.id]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to register technician' }, { status: 500 });
  }
}
