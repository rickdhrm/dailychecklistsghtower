require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const gasChecklistSections = [
  {
    code: 'A',
    title: 'A. AREA TABUNG LPG',
    items: [
      'Tabung dalam kondisi baik.',
      'Tidak terdapat penyok/kerusakan berat.',
      'Tidak terdapat korosi berlebihan.',
      'Tidak terdapat indikasi kebocoran.',
      'Valve tabung dalam kondisi baik.',
      'Tabung berdiri/terpasang sesuai sistem penempatannya.',
      'Tabung terlindung dari benturan.',
      'Area bebas sumber api.',
      'Area bebas rokok.',
      'Tidak ada barang yang tidak berkaitan dengan LPG.',
      'Ventilasi area baik.',
      'Akses menuju tabung tidak terhalang.'
    ]
  },
  {
    code: 'B',
    title: 'B. MANIFOLD DAN VALVE',
    items: [
      'Manifold tidak mengalami kerusakan.',
      'Sambungan tidak menunjukkan indikasi kebocoran.',
      'Valve dapat dioperasikan.',
      'Valve diberi identifikasi.',
      'Tidak terdapat korosi berat.',
      'Tidak terdapat modifikasi tidak resmi.',
      'Kondisi fitting baik.'
    ]
  },
  {
    code: 'C',
    title: 'C. VAPORIZER',
    items: [
      'Kondisi fisik baik.',
      'Tidak terdapat kebocoran.',
      'Tidak terdapat suara/getaran abnormal.',
      'Sambungan baik.',
      'Pressure/indikator dalam kondisi normal sesuai spesifikasi.',
      'Tidak terdapat kerusakan komponen.',
      'Area sekitar vaporizer bersih.',
      'Tidak ada sumber api.',
      'Sistem pengaman vaporizer dalam kondisi baik.'
    ]
  },
  {
    code: 'E',
    title: 'E. PIPA DAN FITTING',
    items: [
      'Pipa tidak rusak.',
      'Tidak terdapat korosi berat.',
      'Tidak terdapat kebocoran.',
      'Support pipa dalam kondisi baik.',
      'Fitting tidak longgar.',
      'Tidak ada modifikasi tanpa izin.',
      'Jalur pipa tidak terhalang.'
    ]
  },
  {
    code: 'F',
    title: 'F. SISTEM KESELAMATAN',
    items: [
      'APAR tersedia.',
      'APAR mudah diakses.',
      'APAR tidak terhalang.',
      'APAR masih dalam masa pemeriksaan.',
      'Rambu DILARANG MEROKOK tersedia.',
      'Rambu BAHAYA GAS tersedia.',
      'Emergency contact tersedia.',
      'Gas detector berfungsi.',
      'Alarm berfungsi.',
      'Ventilasi baik.'
    ]
  },
  {
    code: 'G',
    title: 'G. AREA KITCHEN TENANT',
    items: [
      'Tidak terdapat bau gas.',
      'Seluruh peralatan gas dalam kondisi baik.',
      'Burner berfungsi normal.',
      'Valve peralatan berfungsi.',
      'Tidak terdapat selang/fitting rusak.',
      'Tidak terdapat grease berlebihan.',
      'Tidak ada api terbuka yang tidak diperlukan.',
      'Peralatan gas tidak ditinggalkan tanpa pengawasan.',
      'Valve ditutup setelah operasional.'
    ]
  },
  {
    code: 'H',
    title: 'H. ADMINISTRASI',
    items: [
      'Checklist sebelumnya tersedia.',
      'Maintenance terakhir tercatat.',
      'Laporan gangguan telah ditindaklanjuti.',
      'Dokumen vendor tersedia.',
      'Dokumen pemeriksaan tersedia.',
      'Personel pengguna telah mendapatkan briefing.',
      'Tidak terdapat pekerjaan/modifikasi tanpa izin.'
    ]
  }
];

// Transform sections into the unified hierarchical schema structure
const headings = gasChecklistSections.map((sec, secIdx) => {
  return {
    id: `sec_${sec.code.toLowerCase()}`,
    title: sec.title,
    is_collapsible: true,
    default_expanded: true,
    children: [
      {
        id: `child_${sec.code.toLowerCase()}`,
        label: `Daftar Parameter ${sec.title}`,
        fields: sec.items.map((itemText, itemIdx) => {
          const itemNo = itemIdx + 1;
          const fieldId = `gas_${sec.code.toLowerCase()}_${itemNo}`;
          return {
            id: fieldId,
            item_no: itemNo,
            label: `${itemNo}. ${itemText}`,
            field_type: 'STATUS_TOGGLE',
            options: ['GOOD', 'BAD'],
            required: true,
            has_total_input: true,
            has_remarks_input: true
          };
        })
      }
    ]
  };
});

const gasSchemaDefinition = {
  type: 'CUSTOM',
  form_code: 'FR-LO-005',
  revisi: '00',
  effective_date: '26 Agustus 2026',
  has_findings_section: true,
  has_signoff_matrix: true,
  signoff_roles: ['Petugas', 'Engineering', 'HSE', 'Building Manager'],
  status_options: ['Normal', 'Perlu Perbaikan', 'Critical – Gas Harus Diisolasi'],
  headings: headings
};

async function updateGasChecklist() {
  const client = await pool.connect();
  console.log('🔄 Updating Gas Checklist template in NeonDB to match FR-LO-005...');

  try {
    await client.query('BEGIN');

    const res = await client.query(`
      UPDATE form_templates
      SET title = 'FORMULIR CHECKLIST INSPEKSI GAS LPG SENTRAL',
          description = 'Checklist harian inspeksi gas LPG sentral sesuai standar operasional Form FR-LO-005 Rev. 00.',
          category = 'Utility & Safety',
          form_type = 'CUSTOM',
          schema_definition = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE code = 'CHK-GAS'
      RETURNING id, code, title, version;
    `, [JSON.stringify(gasSchemaDefinition)]);

    if (res.rowCount === 0) {
      // If CHK-GAS doesn't exist, insert it
      await client.query(`
        INSERT INTO form_templates (code, title, description, category, form_type, version, is_active, schema_definition)
        VALUES ('CHK-GAS', 'FORMULIR CHECKLIST INSPEKSI GAS LPG SENTRAL', 'Checklist harian inspeksi gas LPG sentral sesuai standar operasional Form FR-LO-005 Rev. 00.', 'Utility & Safety', 'CUSTOM', 1, true, $1);
      `, [JSON.stringify(gasSchemaDefinition)]);
      console.log('✅ CHK-GAS created from scratch.');
    } else {
      console.log('✅ CHK-GAS updated successfully with 7 sections and 61 items:', res.rows[0]);
    }

    await client.query('COMMIT');
    console.log('🎉 Gas Checklist schema updated in NeonDB.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to update gas checklist:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateGasChecklist();
