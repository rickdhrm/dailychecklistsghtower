import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  try {
    let sql = `
      SELECT s.id, t.title AS checklist_name, t.category,
             l.name AS location_name, l.building, l.floor,
             u.full_name AS technician_name, u.employee_code,
             s.status, s.has_abnormal_reading, s.technician_notes,
             s.submitted_at, s.submission_data
      FROM form_submissions s
      JOIN form_templates t ON s.template_id = t.id
      JOIN users u ON s.technician_id = u.id
      JOIN locations l ON s.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (locationId) {
      sql += ` AND s.location_id = $${pIdx++}`;
      params.push(locationId);
    }
    if (dateFrom) {
      sql += ` AND s.submitted_at >= $${pIdx++}::timestamptz`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND s.submitted_at <= $${pIdx++}::timestamptz`;
      params.push(dateTo);
    }

    sql += ` ORDER BY s.submitted_at DESC`;

    const res = await query(sql, params);

    // Format rows for Excel
    const rows = res.rows.map((r: any, index: number) => {
      return {
        No: index + 1,
        ID: r.id.substring(0, 8),
        Checklist: r.checklist_name,
        Category: r.category,
        Location: `${r.location_name} (${r.building} - ${r.floor})`,
        Technician: `${r.technician_name} [${r.employee_code || '-'}]`,
        Status: r.status,
        Condition: r.has_abnormal_reading ? 'ABNORMAL' : 'NORMAL',
        Notes: r.technician_notes || '-',
        'Submitted At': new Date(r.submitted_at).toLocaleString('id-ID'),
        'Inspection Values (JSON)': JSON.stringify(r.submission_data),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklist Submissions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sgh_checklist_export_${Date.now()}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json({ error: 'Failed to generate Excel export' }, { status: 500 });
  }
}
