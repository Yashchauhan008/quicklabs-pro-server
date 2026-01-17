
export interface File {
    id: string;
    key: string;
    size: number | null;
    mime_type: string | null;
    created_at: Date;
  }
  
  export interface CreateFileDTO {
    key: string;
    size?: number | null;
    mime_type?: string | null;
  }
  