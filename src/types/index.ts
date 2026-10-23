export type UserRole = 'ADMIN' | 'SPV' | 'TECHNICIAN';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  employee_code?: string;
  role: UserRole;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  floor?: string;
  building?: string;
  is_active?: boolean;
}

export type FormType = 'STANDARD' | 'CUSTOM';
export type FieldType = 'TEXT' | 'NUMBER' | 'STATUS_TOGGLE' | 'SELECT';

export interface FormField {
  id: string;
  label: string;
  field_type: FieldType;
  unit?: string;
  min_val?: number;
  max_val?: number;
  options?: string[];
  required?: boolean;
}

export interface FormChild {
  id: string;
  label: string;
  fields: FormField[];
}

export interface FormSubheading {
  id: string;
  title: string;
  fixed_benchmark?: string;
  children: FormChild[];
}

export interface FormHeading {
  id: string;
  title: string;
  is_collapsible?: boolean;
  default_expanded?: boolean;
  subheadings?: FormSubheading[];
  children?: FormChild[];
}

export interface FormSchema {
  type: FormType;
  fields?: FormField[];        // for STANDARD form
  headings?: FormHeading[];     // for CUSTOM hierarchical form
}

export interface FormTemplate {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: string;
  form_type: FormType;
  version: number;
  is_active: boolean;
  schema_definition: FormSchema;
  created_at?: string;
  updated_at?: string;
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'REVISED' | 'FLAGGED_ABNORMAL' | 'ARCHIVED';

export interface FormSubmission {
  id: string;
  template_id: string;
  template_title?: string;
  template_code?: string;
  template_version: number;
  technician_id: string;
  technician_name?: string;
  employee_code?: string;
  location_id: string;
  location_name?: string;
  location_building?: string;
  location_floor?: string;
  status: SubmissionStatus;
  has_abnormal_reading: boolean;
  technician_notes?: string;
  submission_data: Record<string, any>;
  submitted_at: string;
  updated_at: string;
  is_archived?: boolean;
}

export interface HousekeepingLog {
  id: string;
  period_year: number;
  period_month: number;
  range_start: string;
  range_end: string;
  total_records: number;
  export_format: string;
  archive_file_path?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  executed_at: string;
}
