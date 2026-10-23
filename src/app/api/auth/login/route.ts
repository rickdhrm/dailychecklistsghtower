import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, encodeSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const res = await query(
      `SELECT id, username, email, password_hash, full_name, employee_code, role, is_active 
       FROM users 
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [username.trim()]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = res.rows[0];
    const isMatch = await verifyPassword(password, user.password_hash);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
    };

    const token = encodeSession(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        employeeCode: user.employee_code,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
