/** 照片 EXIF 信息 */
export interface PhotoExif {
  camera?: string;     // 相机型号，如 "SONY ILCE-7M4"
  lens?: string;       // 镜头型号
  aperture?: string;   // 光圈，如 "f/2.8"
  shutter?: string;    // 快门，如 "1/250"
  iso?: number;        // ISO，如 400
  focalLength?: string;// 焦距，如 "85mm"
  takenAt?: string;    // 拍摄时间
}

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
  /** 相机 EXIF 信息（部分照片可能没有） */
  exif?: PhotoExif;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  photos?: Photo[];
  photo?: Photo;
}
