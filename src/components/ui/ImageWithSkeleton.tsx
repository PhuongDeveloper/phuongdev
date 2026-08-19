'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative ${containerClassName}`}>
      {!isLoaded && (
        <Skeleton className={`absolute inset-0 w-full h-full z-10 ${skeletonClassName}`} />
      )}
      <img
        ref={imgRef}
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
