import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SPV')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const res = await query(
      `SELECT h.*, u.full_name AS executed_by_name
       FROM housekeeping_logs h
       LEFT JOIN users u ON h.executed_by = u.id
       ORDER BY h.period_year DESC, h.period_month DESC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching housekeeping logs:', error);
    return NextResponse.json({ error: 'Failed to fetch housekeeping history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only Administrators can trigger data housekeeping' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    
    // Default to prior month or specified period
    let year = body.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    let month = body.month || (now.getMonth() === 0 ? 12 : now.getMonth());

    const rangeStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const rangeEnd = new Date(Date.UTC(year, month, 1)).toISOString();

    // 1. Mark records in this month as archived
    const updateRes = await query(
      `UPDATE form_submissions 
       SET is_archived = TRUE, status = 'ARCHIVED'
       WHERE submitted_at >= $1::timestamptz 
         AND submitted_at < $2::timestamptz 
         AND is_archived = FALSE
       RETURNING id`,
      [rangeStart, rangeEnd]
    );

    const totalArchived = updateRes.rowCount || 0;

    // 2. Insert or update housekeeping log
    const logRes = await query(
      `INSERT INTO housekeeping_logs (
        period_year, period_month, range_start, range_end, total_records, export_format, status, executed_by, executed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, 'EXCEL+PDF', 'COMPLETED', $6, CURRENT_TIMESTAMP, $7)
      ON CONFLICT (period_year, period_month) DO UPDATE 
      SET total_records = EXCLUDED.total_records, executed_at = CURRENT_TIMESTAMP, status = 'COMPLETED', executed_by = EXCLUDED.executed_by
      RETURNING *`,
      [
        year,
        month,
        rangeStart,
        rangeEnd,
        totalArchived,
        currentUser.id,
        JSON.stringify({ triggered_at: new Date().toISOString(), archived_count: totalArchived })
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Housekeeping completed for ${month}/${year}. ${totalArchived} records archived.`,
      log: logRes.rows[0],
    });
  } catch (error: any) {
    console.error('Error running housekeeping routine:', error);
    return NextResponse.json({ error: 'Failed to execute housekeeping routine' }, { status: 500 });
  }
}
