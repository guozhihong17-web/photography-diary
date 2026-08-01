import { Photo } from '@/types';
import { getPhotoSrc } from '@/lib/cloudinary-url';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

export default function PhotoCard({ photo, onClick }: PhotoCardProps) {
  return (
    <div
      className="break-inside-avoid mb-4 rounded-sm overflow-hidden cursor-pointer relative bg-dark-900 group hover:scale-[1.015] transition-transform duration-300"
      onClick={onClick}
    >
      <img
        src={getPhotoSrc(photo, 'thumb')}
        alt={photo.title}
        loading="lazy"
        className="w-full h-auto block group-hover:brightness-50 transition-all duration-300"
      />
      <div className="absolute bottom-0 left-0 right-0 pt-10 px-4 pb-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <h3 className="text-sm font-medium">{photo.title}</h3>
        <span className="inline-block mt-1 text-xs text-accent-gold bg-black/50 px-2 py-0.5 rounded-full">
          {photo.category || '未分类'}
        </span>
      </div>
    </div>
  );
}
