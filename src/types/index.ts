export interface Photo {
  id: string;
  filename: string;
  thumbFilename: string;
  title: string;
  description: string;
  category: string;
  uploadedAt: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalName: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  photos?: Photo[];
  photo?: Photo;
}
