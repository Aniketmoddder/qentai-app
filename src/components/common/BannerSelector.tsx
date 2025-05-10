'use client';

import Image from 'next/image';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface BannerSelectorProps {
  currentBannerUrl?: string | null;
  onBannerSelect: (url: string) => void;
  title?: string;
  sectionTitle?: string;
}

const BANNER_BASE_URL = 'https://ik.imagekit.io/aniplay123/banner/';
const BANNER_COUNT = 13; // b1.png to b13.png

const bannerUrls = Array.from({ length: BANNER_COUNT }, (_, i) => `${BANNER_BASE_URL}b${i + 1}.png`);

export default function BannerSelector({
  currentBannerUrl,
  onBannerSelect,
  title = "Select Banner",
  sectionTitle = "Profile Banners"
}: BannerSelectorProps) {
  return (
    <div className="space-y-4 my-4">
      {title && <h3 className="text-lg font-medium text-foreground">{title}</h3>}
      {sectionTitle && <p className="text-sm text-muted-foreground -mt-2 mb-3">{sectionTitle}</p>}
      <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border/30 bg-background/30">
        <div className="flex space-x-3 p-3">
          {bannerUrls.map((url) => {
            const fileNameWithExtension = url.split('/').pop() || '';
            const fileName = fileNameWithExtension.split('.')[0] || fileNameWithExtension;
            const altText = `Banner option ${fileName}`;
            
            return (
              <button
                type="button"
                key={url}
                onClick={() => onBannerSelect(url)}
                className={cn(
                  "relative aspect-[16/9] h-24 sm:h-28 rounded-md overflow-hidden border-2 transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background flex-shrink-0",
                  currentBannerUrl === url ? 'border-primary scale-105 shadow-lg' : 'border-transparent hover:border-primary/50 hover:scale-105'
                )}
                aria-label={altText}
              >
                <Image
                  src={url}
                  alt={altText}
                  fill
                  sizes="(max-width: 640px) 40vw, 200px"
                  className="object-cover"
                  data-ai-hint="anime landscape banner"
                  priority={bannerUrls.indexOf(url) < 3} // Prioritize loading first few images
                />
                {currentBannerUrl === url && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
