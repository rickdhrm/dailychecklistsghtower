require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const client = await pool.connect();
  console.log('🔍 Running NeonDB Verification Suite...\n');

  try {
    // 1. Check Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('📊 Active Tables in NeonDB:');
    tablesRes.rows.forEach(r => console.log(`  - ${r.table_name}`));

    // 2. Count Records
    const counts = {};
    for (const row of tablesRes.rows) {
      const cRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}";`);
      counts[row.table_name] = parseInt(cRes.rows[0].count, 10);
    }
    console.log('\n🔢 Record Counts:');
    console.table(counts);

    // 3. Verify Form Checklists
    const formsRes = await client.query(`
      SELECT code, title, form_type, category, version 
      FROM form_templates 
      ORDER BY code;
    `);
    console.log('\n📋 Seeded Checklist Form Templates:');
    console.table(formsRes.rows);

    // 4. Verify Barcode Assets
    const assetsRes = await client.query(`
      SELECT a.barcode, a.name AS asset_name, l.name AS location, a.category 
      FROM assets a
      JOIN locations l ON a.location_id = l.id
      ORDER BY a.barcode;
    `);
    console.log('\n🏷️ Seeded Barcode Hardware Assets:');
    console.table(assetsRes.rows);

    // 5. Test Live Submission + JSONB Querying
    const user = (await client.query(`SELECT id FROM users WHERE role = 'TECHNICIAN' LIMIT 1;`)).rows[0];
    const template = (await client.query(`SELECT id, version FROM form_templates WHERE code = 'CHK-POMPA' LIMIT 1;`)).rows[0];
    const asset = (await client.query(`SELECT id, location_id, barcode FROM assets WHERE barcode = 'BC-PUMP-01' LIMIT 1;`)).rows[0];

    const sampleSubmission = {
      f_volt_rs: 382,
      f_volt_st: 380,
      f_volt_tr: 381,
      f_curr_r: 22.4,
      f_curr_s: 22.1,
      f_curr_t: 22.5,
      f_press_suction: 1.5,
      f_press_discharge: 5.2,
      f_seal_leakage: 'NORMAL',
      f_vibration_status: 'NORMAL'
    };

    const subRes = await client.query(`
      INSERT INTO form_submissions (
        template_id, template_version, technician_id, location_id, asset_id, barcode_scanned, status, has_abnormal_reading, technician_notes, submission_data
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED', false, 'Pemeriksaan rutin pagi - kondisi normal.', $7)
      RETURNING id, submitted_at;
    `, [template.id, template.version, user.id, asset.location_id, asset.id, asset.barcode, JSON.stringify(sampleSubmission)]);

    const subId = subRes.rows[0].id;
    console.log(`\n✅ Test submission inserted successfully! ID: ${subId}`);

    // Query JSONB field directly with PostgreSQL path operator
    const jsonbQuery = await client.query(`
      SELECT id, barcode_scanned, submission_data->>'f_press_discharge' AS discharge_press, submission_data->>'f_seal_leakage' AS seal_status
      FROM form_submissions
      WHERE id = $1;
    `, [subId]);
    console.log('🔎 Verification of JSONB Query result:');
    console.table(jsonbQuery.rows);

  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
