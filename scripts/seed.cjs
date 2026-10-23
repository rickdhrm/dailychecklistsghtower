require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSeed() {
  const client = await pool.connect();
  console.log('🌱 Starting database seed on NeonDB...');

  try {
    await client.query('BEGIN');

    // 1. Password hash for demo users
    const defaultPassword = await bcrypt.hash('SGHAdmin2026!', 10);
    const techPassword = await bcrypt.hash('SGHTech2026!', 10);

    // 2. Insert Admin User
    const adminRes = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, employee_code, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO UPDATE 
      SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
      RETURNING id;
    `, ['admin', 'admin@sgh.local', defaultPassword, 'Lead Facility Admin', 'ADM-001', 'ADMIN', true]);
    const adminId = adminRes.rows[0].id;

    // 3. Insert Supervisor (SPV)
    const spvRes = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, employee_code, role, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO UPDATE 
      SET full_name = EXCLUDED.full_name
      RETURNING id;
    `, ['spv_andi', 'andi.spv@sgh.local', defaultPassword, 'Andi Supervisor', 'SPV-001', 'SPV', true, adminId]);
    const spvId = spvRes.rows[0].id;

    // 4. Insert Technicians (Registered by Admin)
    const techBudiRes = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, employee_code, role, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO UPDATE 
      SET full_name = EXCLUDED.full_name
      RETURNING id;
    `, ['tech_budi', 'budi.tech@sgh.local', techPassword, 'Budi Santoso', 'TCH-101', 'TECHNICIAN', true, adminId]);

    const techSitiRes = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, employee_code, role, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO UPDATE 
      SET full_name = EXCLUDED.full_name
      RETURNING id;
    `, ['tech_siti', 'siti.tech@sgh.local', techPassword, 'Siti Rahma', 'TCH-102', 'TECHNICIAN', true, adminId]);

    console.log('👤 Users seeded: Admin, SPV, and 2 Technicians.');

    // 5. Insert Locations
    const locationsData = [
      { code: 'LOC-B1-PUMP', name: 'Basement 1 Pump Room', floor: 'B1', building: 'Tower A' },
      { code: 'LOC-LIFT-MR', name: 'Lift Machine Room Rooftop', floor: 'L15', building: 'Tower A' },
      { code: 'LOC-MCFA-MAIN', name: 'Control Room Fire Alarm', floor: 'GF', building: 'Main Lobby' },
      { code: 'LOC-SERVER-ACC', name: 'Server & Access Card Room', floor: 'L02', building: 'Annex' },
      { code: 'LOC-PAGING-EVAC', name: 'Security Evacuation Center', floor: 'GF', building: 'Main Lobby' },
      { code: 'LOC-ITM-DAIKIN', name: 'HVAC ITM Daikin Central Hub', floor: 'B1', building: 'Tower A' },
      { code: 'LOC-GAS-STATION', name: 'Main Gas Regulating Manifold', floor: 'Outdoor', building: 'Utility Yard' },
      { code: 'LOC-GARDU-PLN', name: 'Gardu Listrik PLN Substation', floor: 'Outdoor', building: 'Substation Yard' },
    ];

    const locationIdMap = {};
    for (const loc of locationsData) {
      const res = await client.query(`
        INSERT INTO locations (code, name, floor, building, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, floor = EXCLUDED.floor
        RETURNING id, code;
      `, [loc.code, loc.name, loc.floor, loc.building]);
      locationIdMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log('📍 8 Locations seeded.');

    // 6. Define the 8 Core Checklist Templates
    const formTemplates = [
      {
        code: 'CHK-POMPA',
        title: 'Checklist Pompa',
        description: 'Pemeriksaan harian operasional pompa air bersih, booster, dan chiller.',
        category: 'Mechanical',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_motor',
              title: '1. Motor & Kelistrikan Pompa',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_elec_param',
                  title: 'Parameter Tegangan & Arus',
                  fixed_benchmark: 'Tegangan Standard: 380V ±5% | Arus Max: 28A',
                  children: [
                    {
                      id: 'child_voltage',
                      label: 'Tegangan Kerja (Voltage)',
                      fields: [
                        { id: 'f_volt_rs', label: 'Voltase Phase R-S', field_type: 'NUMBER', unit: 'V', min_val: 360, max_val: 400, required: true },
                        { id: 'f_volt_st', label: 'Voltase Phase S-T', field_type: 'NUMBER', unit: 'V', min_val: 360, max_val: 400, required: true },
                        { id: 'f_volt_tr', label: 'Voltase Phase T-R', field_type: 'NUMBER', unit: 'V', min_val: 360, max_val: 400, required: true }
                      ]
                    },
                    {
                      id: 'child_current',
                      label: 'Arus Beban (Current)',
                      fields: [
                        { id: 'f_curr_r', label: 'Ampere R', field_type: 'NUMBER', unit: 'A', max_val: 28, required: true },
                        { id: 'f_curr_s', label: 'Ampere S', field_type: 'NUMBER', unit: 'A', max_val: 28, required: true },
                        { id: 'f_curr_t', label: 'Ampere T', field_type: 'NUMBER', unit: 'A', max_val: 28, required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_mechanical',
              title: '2. Kondisi Mekanikal & Tekanan',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_pressure',
                  title: 'Pressure Gauge & Sealing',
                  fixed_benchmark: 'Discharge: 4.5 - 6.0 Bar | Suction: 1.0 - 2.0 Bar',
                  children: [
                    {
                      id: 'child_pressure',
                      label: 'Pressure Reading',
                      fields: [
                        { id: 'f_press_suction', label: 'Tekanan Suction', field_type: 'NUMBER', unit: 'Bar', required: true },
                        { id: 'f_press_discharge', label: 'Tekanan Discharge', field_type: 'NUMBER', unit: 'Bar', required: true },
                        { id: 'f_seal_leakage', label: 'Kebocoran Mechanical Seal', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                        { id: 'f_vibration_status', label: 'Getaran & Kebisingan', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        code: 'CHK-LIFT',
        title: 'Checklist Operasional Lift',
        description: 'Pemeriksaan harian keselamatan lift penumpang dan lift servis.',
        category: 'Elevator',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_hoistway',
              title: '1. Ruang Mesin & Traction Motor',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_motor_lift',
                  title: 'Traction Machine & Brake System',
                  fixed_benchmark: 'Suhu Max: 65°C | ARD Battery: > 48V',
                  children: [
                    {
                      id: 'child_traction',
                      label: 'Inspeksi Mesin Tarik',
                      fields: [
                        { id: 'f_temp_motor', label: 'Suhu Mesin Tarik', field_type: 'NUMBER', unit: '°C', max_val: 65, required: true },
                        { id: 'f_brake_clearance', label: 'Kondisi Sepatu Rem & Clearance', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                        { id: 'f_ard_voltage', label: 'Tegangan Battery ARD', field_type: 'NUMBER', unit: 'VDC', min_val: 48, required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_car_safety',
              title: '2. Kereta Lift & Safety Interlock',
              is_collapsible: true,
              children: [
                {
                  id: 'child_car_features',
                  label: 'Fitur Keamanan Sangkar',
                  fields: [
                    { id: 'f_door_sensor', label: 'Safety Edge & Photocell Pintu', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                    { id: 'f_intercom_status', label: 'Intercom Darurat ke Security', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                    { id: 'f_alarm_button', label: 'Tombol Bell Darurat (Emergency Alarm)', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        code: 'CHK-MCFA',
        title: 'Checklist Operasional MCFA & Annunciator',
        description: 'Pemeriksaan Main Control Fire Alarm dan panel Annunciator.',
        category: 'Fire Safety',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_mcfa_power',
              title: '1. Power Supply & Battery Backup',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_mcfa_specs',
                  title: 'Standar Tegangan DC & Charger',
                  fixed_benchmark: 'Standar Standby: 24 - 27.4 VDC',
                  children: [
                    {
                      id: 'child_mcfa_volt',
                      label: 'Status Daya Listrik',
                      fields: [
                        { id: 'f_mcfa_ac_power', label: 'Lampu Indikator AC Normal', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                        { id: 'f_mcfa_dc_volt', label: 'Tegangan Baterai Backup', field_type: 'NUMBER', unit: 'VDC', min_val: 24, max_val: 28, required: true },
                        { id: 'f_mcfa_charger_status', label: 'Status Charger Battery', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_mcfa_zones',
              title: '2. Status Zone Supervisory & Trouble',
              is_collapsible: true,
              children: [
                {
                  id: 'child_zone_status',
                  label: 'Trouble & Alarm LED Status',
                  fields: [
                    { id: 'f_trouble_led', label: 'Status LED Trouble Panel', field_type: 'STATUS_TOGGLE', options: ['OFF (NORMAL)', 'ON (TROUBLE)'], required: true },
                    { id: 'f_annunciator_sync', label: 'Sinkronisasi Panel Annunciator', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
                    { id: 'f_bell_silence', label: 'Status Switch Bell Silence', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'SILENCED'], required: true }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        code: 'CHK-ACCESS',
        title: 'Checklist Komputer Access Card',
        description: 'Inspeksi server access card, database controller, dan card reader.',
        category: 'IT & Security',
        form_type: 'STANDARD',
        schema: {
          type: 'STANDARD',
          fields: [
            { id: 'f_srv_uptime', label: 'Server PC Power & OS Uptime', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
            { id: 'f_srv_cpu_usage', label: 'Beban CPU Server (%)', field_type: 'NUMBER', unit: '%', max_val: 80, required: true },
            { id: 'f_srv_ram_usage', label: 'Beban RAM Server (%)', field_type: 'NUMBER', unit: '%', max_val: 85, required: true },
            { id: 'f_ctrl_comm_status', label: 'Komunikasi Controller TCP/IP', field_type: 'STATUS_TOGGLE', options: ['ONLINE', 'OFFLINE'], required: true },
            { id: 'f_ups_status', label: 'Status UPS Server Access', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ON-BATTERY', 'FAULT'], required: true },
            { id: 'f_notes', label: 'Catatan Kendala Reader / Kartu', field_type: 'TEXT', required: false }
          ]
        }
      },
      {
        code: 'CHK-PAGING',
        title: 'Checklist Panel Paging Evakuasi',
        description: 'Pemeriksaan amplifier, zona speaker evakuasi, dan microphone sentral.',
        category: 'Safety Audio',
        form_type: 'STANDARD',
        schema: {
          type: 'STANDARD',
          fields: [
            { id: 'f_power_amp', label: 'Status Power Amplifier Unit', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'FAULT'], required: true },
            { id: 'f_mic_emergency', label: 'Uji Fungsi Paging Mic Darurat', field_type: 'STATUS_TOGGLE', options: ['CLEAR', 'DISTORTED', 'DEAD'], required: true },
            { id: 'f_matrix_selector', label: 'Selector Zone Evakuasi Semua Lantai', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'ABNORMAL'], required: true },
            { id: 'f_pilot_tone', label: 'Line Supervisory / Pilot Tone', field_type: 'STATUS_TOGGLE', options: ['OK', 'OPEN-CIRCUIT', 'SHORT'], required: true },
            { id: 'f_remarks', label: 'Keterangan Hasil Uji Suara', field_type: 'TEXT', required: false }
          ]
        }
      },
      {
        code: 'CHK-ITM-DAIKIN',
        title: 'Checklist Panel ITM Daikin',
        description: 'Pemeriksaan Intelligent Touch Manager Daikin untuk sistem VRV/VRF.',
        category: 'HVAC',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_itm_comm',
              title: '1. Komunikasi DIII-Net Gateway',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_gateway_bench',
                  title: 'DIII-Net Status Benchmark',
                  fixed_benchmark: 'Gateway Link: Solid Green | Total Unit: 48 Indoor Units',
                  children: [
                    {
                      id: 'child_diii_status',
                      label: 'Gateway Connectivity',
                      fields: [
                        { id: 'f_diii_link', label: 'Status Link DIII-Net', field_type: 'STATUS_TOGGLE', options: ['NORMAL', 'COMM_ERROR'], required: true },
                        { id: 'f_active_indoor', label: 'Jumlah Indoor Unit Terdeteksi', field_type: 'NUMBER', unit: 'Unit', required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_itm_alarm',
              title: '2. Error Code & Setpoint Schedule',
              is_collapsible: true,
              children: [
                {
                  id: 'child_error_logs',
                  label: 'Monitoring Gangguan VRV',
                  fields: [
                    { id: 'f_error_code_present', label: 'Apakah Ada Kode Error Unit?', field_type: 'STATUS_TOGGLE', options: ['TIDAK ADA', 'ADA ERROR'], required: true },
                    { id: 'f_error_code_detail', label: 'Kode Error (Bila ada, cth: A3, L5)', field_type: 'TEXT', required: false },
                    { id: 'f_touch_screen_resp', label: 'Respons Layar Touch Screen ITM', field_type: 'STATUS_TOGGLE', options: ['RESPONSIF', 'LAG/MACET'], required: true }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        code: 'CHK-GAS',
        title: 'Checklist Gas',
        description: 'Inspeksi harian instalasi pipa gas elpiji/LNG, regulator dan sensor kebocoran.',
        category: 'Utility & Safety',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_gas_press',
              title: '1. Tekanan & Manifold Header',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_gas_bench',
                  title: 'Benchmark Tekanan Gas Regulated',
                  fixed_benchmark: 'Main Header: 2.8 - 3.2 kPa | Tank Pressure: > 4 Bar',
                  children: [
                    {
                      id: 'child_pressures',
                      label: 'Pengukuran Manometer',
                      fields: [
                        { id: 'f_tank_press', label: 'Tekanan Tangki Utama', field_type: 'NUMBER', unit: 'Bar', min_val: 3.5, required: true },
                        { id: 'f_reg_header_press', label: 'Tekanan Header Distribusi', field_type: 'NUMBER', unit: 'kPa', min_val: 2.8, max_val: 3.2, required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_gas_leak',
              title: '2. Deteksi Kebocoran & Solenoid Emergency',
              is_collapsible: true,
              children: [
                {
                  id: 'child_leak_sensor',
                  label: 'Sensor & Katup Darurat',
                  fields: [
                    { id: 'f_gas_detector_status', label: 'Gas Detector Indikator', field_type: 'STATUS_TOGGLE', options: ['SAFE (0 PPM)', 'WARNING', 'LEAK ALERT'], required: true },
                    { id: 'f_solenoid_valve_pos', label: 'Posisi Solenoid Valve Utama', field_type: 'STATUS_TOGGLE', options: ['OPEN (NORMAL)', 'TRIPPED/CLOSED'], required: true },
                    { id: 'f_odorant_level', label: 'Deteksi Bau Khas Gas / Odorant', field_type: 'STATUS_TOGGLE', options: ['TIDAK BERBAU', 'TERCIUM BAU GAS'], required: true }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        code: 'CHK-PLN',
        title: 'Checklist Meteran Listrik Gardu PLN',
        description: 'Pemeriksaan harian incoming feeder 20kV, transformator, dan kwh meter PLN.',
        category: 'Electrical Power',
        form_type: 'CUSTOM',
        schema: {
          type: 'CUSTOM',
          headings: [
            {
              id: 'sec_pln_incoming',
              title: '1. Tegangan Incoming & Cubicle 20kV',
              is_collapsible: true,
              subheadings: [
                {
                  id: 'sub_pln_bench',
                  title: 'Standar Tegangan Menengah & Cos Phi',
                  fixed_benchmark: 'Tegangan: 20.0 kV ±5% | Cos φ Minimal: 0.85 Lagging',
                  children: [
                    {
                      id: 'child_mv_reading',
                      label: 'Tegangan Gardu',
                      fields: [
                        { id: 'f_incoming_kv', label: 'Tegangan Menengah Incoming', field_type: 'NUMBER', unit: 'kV', min_val: 19.0, max_val: 21.0, required: true },
                        { id: 'f_cos_phi', label: 'Power Factor (Cos φ)', field_type: 'NUMBER', min_val: 0.85, max_val: 1.0, required: true }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'sec_kwh_meter',
              title: '2. Rekaman Angka Meter Listrik',
              is_collapsible: true,
              children: [
                {
                  id: 'child_kwh_counters',
                  label: 'Stand Meter PLN',
                  fields: [
                    { id: 'f_kwh_wbp', label: 'Stand Meter WBP (Waktu Beban Puncak)', field_type: 'NUMBER', unit: 'kWh', required: true },
                    { id: 'f_kwh_lwbp', label: 'Stand Meter LWBP (Luar Beban Puncak)', field_type: 'NUMBER', unit: 'kWh', required: true },
                    { id: 'f_kvarh_reading', label: 'Stand Meter kVARh (Daya Reaktif)', field_type: 'NUMBER', unit: 'kVARh', required: true },
                    { id: 'f_max_demand_kva', label: 'Max Demand Indikator (kVA)', field_type: 'NUMBER', unit: 'kVA', required: true }
                  ]
                }
              ]
            }
          ]
        }
      }
    ];

    const templateIdMap = {};
    for (const tmpl of formTemplates) {
      const res = await client.query(`
        INSERT INTO form_templates (code, title, description, category, form_type, version, is_active, schema_definition, created_by)
        VALUES ($1, $2, $3, $4, $5, 1, true, $6, $7)
        ON CONFLICT (code, version) DO UPDATE 
        SET title = EXCLUDED.title, description = EXCLUDED.description, schema_definition = EXCLUDED.schema_definition
        RETURNING id, code;
      `, [tmpl.code, tmpl.title, tmpl.description, tmpl.category, tmpl.form_type, JSON.stringify(tmpl.schema), adminId]);
      templateIdMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log('📋 All 8 Form Templates seeded with custom and standard schemas.');

    // 7. Seed Assets linked to Barcodes and default templates
    const assetSeeds = [
      { barcode: 'BC-PUMP-01', name: 'Chilled Water Pump #01', location_code: 'LOC-B1-PUMP', category: 'Mechanical', template_code: 'CHK-POMPA' },
      { barcode: 'BC-LIFT-PASS-01', name: 'Passenger Elevator L01', location_code: 'LOC-LIFT-MR', category: 'Elevator', template_code: 'CHK-LIFT' },
      { barcode: 'BC-MCFA-MAIN', name: 'Main Fire Alarm Control Panel', location_code: 'LOC-MCFA-MAIN', category: 'Fire Safety', template_code: 'CHK-MCFA' },
      { barcode: 'BC-ACCESS-SRV', name: 'Access Controller Server Rack', location_code: 'LOC-SERVER-ACC', category: 'IT & Security', template_code: 'CHK-ACCESS' },
      { barcode: 'BC-EVAC-RACK', name: 'Master Evacuation Paging Rack', location_code: 'LOC-PAGING-EVAC', category: 'Safety Audio', template_code: 'CHK-PAGING' },
      { barcode: 'BC-ITM-DAIKIN-01', name: 'ITM Daikin Touch Manager #1', location_code: 'LOC-ITM-DAIKIN', category: 'HVAC', template_code: 'CHK-ITM-DAIKIN' },
      { barcode: 'BC-GAS-MANIFOLD', name: 'LPG Gas Manifold Header', location_code: 'LOC-GAS-STATION', category: 'Utility & Safety', template_code: 'CHK-GAS' },
      { barcode: 'BC-PLN-INCOMING', name: 'Gardu PLN 20kV Incoming Meter', location_code: 'LOC-GARDU-PLN', category: 'Electrical Power', template_code: 'CHK-PLN' }
    ];

    for (const asset of assetSeeds) {
      await client.query(`
        INSERT INTO assets (barcode, name, location_id, category, default_template_id, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (barcode) DO UPDATE 
        SET name = EXCLUDED.name, location_id = EXCLUDED.location_id, default_template_id = EXCLUDED.default_template_id;
      `, [asset.barcode, asset.name, locationIdMap[asset.location_code], asset.category, templateIdMap[asset.template_code]]);
    }
    console.log('🏷️ 8 Hardware Assets seeded with Barcodes.');

    await client.query('COMMIT');
    console.log('🎉 NeonDB database seed finished successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
