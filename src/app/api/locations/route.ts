import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(
      `SELECT id, code, name, floor, building 
       FROM locations 
       WHERE is_active = true 
       ORDER BY building, floor, name ASC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
