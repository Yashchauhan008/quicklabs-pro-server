export type DocumentVisibility = 'PUBLIC' | 'PRIVATE';
export type DocumentKind = 'informational' | 'lab_solutions';

export interface DocumentFileRow {
  id: string;
  document_id: string;
  file_id: string;
  is_main: boolean;
  description: string | null;
  sort_order: number;
}

export interface Document {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  visibility: DocumentVisibility;
  uploaded_by: string;
  download_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateDocumentDTO {
  subject_id: string;
  title: string;
  description?: string;
  kind?: DocumentKind;
  visibility?: DocumentVisibility;
}

export interface UpdateDocumentDTO {
  title?: string;
  description?: string;
  kind?: DocumentKind;
  visibility?: DocumentVisibility;
}

export interface DocumentWithDetails extends Document {
  subject_name: string;
  uploader_name: string;
  uploader_email: string;
  file_key: string | null;
  file_size: number | null;
  file_mime_type: string | null;
  file_count?: number;
}

export interface DocumentListItem {
  id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  visibility: DocumentVisibility;
  download_count: number;
  created_at: Date;
  subject_name: string;
  uploader_name: string;
  file_key: string | null;
  file_size: number | null;
  file_mime_type: string | null;
  file_count?: number;
}
