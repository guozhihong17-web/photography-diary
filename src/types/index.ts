export interface Photo {
  id: string;
  /** Cloudinary public_id（云端照片） */
  publicId?: string;
  /** 本地展示图文件名（本地照片兼容） */
  filename?: string;
  /** 本地缩略图文件名（本地照片兼容） */
  thumbFilename?: string;
  title: string;
  description: string;
  category: string;
  uploadedAt: string;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  originalName: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  photos?: Photo[];
  photo?: Photo;
}
