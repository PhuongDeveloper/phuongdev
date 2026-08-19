'use client';

import React, { useState } from 'react';
import Skeleton from './Skeleton';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  skeletonClassName?: string;
}

export default function ImageWithSkeleton({
  src,
  alt,
  className = '',
  containerClassName = '',
  skeletonClassName = '',
  ...props
}: ImageWithSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative ${containerClassName}`}>
      {!isLoaded && (
        <Skeleton className={`absolute inset-0 w-full h-full z-10 ${skeletonClassName}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)} // In case of error, remove skeleton to show alt text or broken image icon
        {...props}
      />
    </div>
  );
}
