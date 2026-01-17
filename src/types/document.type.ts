export type DocumentVisibility = 'PUBLIC' | 'PRIVATE';

export interface Document {
  id: string;
  subject_id: string;
  file_id: string;
  title: string;
  description: string | null;
  visibility: DocumentVisibility;
  uploaded_by: string;
  download_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateDocumentDTO {
  subject_id: string;
  file_id: string;
  title: string;
  description?: string;
  visibility?: DocumentVisibility;
}

export interface UpdateDocumentDTO {
  title?: string;
  description?: string;
  visibility?: DocumentVisibility;
  file_id?: string;
}

export interface DocumentWithDetails extends Document {
  subject_name: string;
  uploader_name: string;
  uploader_email: string;
  file_key: string;
  file_size: number | null;
  file_mime_type: string | null;
}

export interface DocumentListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: DocumentVisibility;
  download_count: number;
  created_at: Date;
  subject_name: string;
  uploader_name: string;
  file_key: string;
  file_size: number | null;
  file_mime_type: string | null;
}