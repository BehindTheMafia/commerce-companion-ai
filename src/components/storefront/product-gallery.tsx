import { useState, useCallback } from "react";
import { Package, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/storefront";

type ProductGalleryProps = {
  images: ProductImage[];
  mainImageUrl: string | null;
  productName: string;
  badges?: React.ReactNode;
};

export function ProductGallery({ images, mainImageUrl, productName, badges }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const allImages =
    images.length > 0
      ? images
      : mainImageUrl
        ? [{ id: "main", url: mainImageUrl, alt: productName, sort_order: 0 }]
        : [];

  const currentImage = allImages[activeIndex];
  const hasMultiple = allImages.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) setActiveIndex(allImages.length - 1);
      else if (index >= allImages.length) setActiveIndex(0);
      else setActiveIndex(index);
      setImgLoaded(false);
    },
    [allImages.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(activeIndex - 1);
      else if (e.key === "ArrowRight") goTo(activeIndex + 1);
      else if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false);
    },
    [activeIndex, goTo, lightboxOpen],
  );

  return (
    <>
      <div className="relative" role="region" aria-label="Galería del producto">
        <div className="lg:sticky lg:top-[110px]">
          {/* Main Image */}
          <div
            className="relative w-full overflow-hidden bg-[#FAFAFA] cursor-zoom-in rounded-[28px]"
            style={{ aspectRatio: "1 / 1", padding: "clamp(16px, 2vw, 24px)" }}
            onClick={() => currentImage && setLightboxOpen(true)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label="Ampliar imagen"
          >
            {currentImage && !imgError ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-[clamp(16px,2vw,24px)] rounded-[20px] bg-muted animate-pulse" />
                )}
                <img
                  src={currentImage.url}
                  alt={currentImage.alt ?? productName}
                  className="absolute inset-[clamp(16px,2vw,24px)] w-[calc(100%-clamp(32px,4vw,48px))] h-[calc(100%-clamp(32px,4vw,48px))] object-cover rounded-[20px]"
                  style={{
                    opacity: imgLoaded ? 1 : 0,
                    transition: "opacity .3s cubic-bezier(.22,.61,.36,1)",
                  }}
                  loading="eager"
                  fetchPriority="high"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="absolute inset-[clamp(16px,2vw,24px)] rounded-[20px] flex items-center justify-center bg-muted/30">
                <Package className="size-16 text-muted-foreground/15" strokeWidth={1} />
              </div>
            )}

            {/* Navigation arrows (multiple images) */}
            {hasMultiple && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(activeIndex - 1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full bg-background/80 backdrop-blur-md border border-border/40 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background transition-all"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(activeIndex + 1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full bg-background/80 backdrop-blur-md border border-border/40 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background transition-all"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}

            {/* Badges */}
            {badges && (
              <div className="absolute left-5 top-5 flex flex-col gap-2 z-10">{badges}</div>
            )}
          </div>

          {/* Thumbnails */}
          {hasMultiple && (
            <div
              className="mt-3 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1"
              role="tablist"
              aria-label="Vistas del producto"
            >
              {allImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => goTo(i)}
                  className={cn(
                    "shrink-0 snap-start rounded-2xl overflow-hidden border-2 transition-all duration-250",
                    i === activeIndex
                      ? "border-primary shadow-lg shadow-black/8"
                      : "border-primary/20",
                  )}
                  style={{ width: "96px", height: "96px" }}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={img.alt ?? `Vista ${i + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? `Vista ${i + 1}`}
                    className={cn(
                      "size-full object-cover transition-all duration-250",
                      i === activeIndex
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-100 hover:scale-[1.04]",
                    )}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          {hasMultiple && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(activeIndex - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(activeIndex + 1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          <img
            src={currentImage.url}
            alt={currentImage.alt ?? productName}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
