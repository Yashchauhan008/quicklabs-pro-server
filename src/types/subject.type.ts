
export interface Subject {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }
  
  export interface CreateSubjectDTO {
    name: string;
    description?: string;
  }
  
  export interface UpdateSubjectDTO {
    name?: string;
    description?: string;
  }
  
  export interface SubjectWithCreator extends Subject {
    creator_name: string;
    creator_email: string;
  }
  
  export interface SubjectWithDocumentCount extends Subject {
    document_count: number;
    creator_name: string;
  }
  