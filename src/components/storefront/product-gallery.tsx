import { useState, useCallback, useRef } from "react";
import { Package, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/storefront";

type ProductGalleryProps = {
  images: ProductImage[];
  mainImageUrl: string | null;
  productName: string;
  discountPercent?: number | null;
  badges?: React.ReactNode;
};

export function ProductGallery({
  images,
  mainImageUrl,
  productName,
  discountPercent,
  badges,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setMousePos({ x, y });
  };

  return (
    <>
      <div className="relative" role="region" aria-label="Galería del producto">
        <div className="lg:sticky lg:top-[110px]">
          {/* Desktop: vertical thumbs + main image side by side */}
          <div className="flex flex-col-reverse lg:flex-row gap-6">
            {/* Thumbnails - vertical on desktop, horizontal on mobile */}
            {hasMultiple && (
              <div
                className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:w-24 pb-2 lg:pb-0 shrink-0"
                role="tablist"
                aria-label="Vistas del producto"
              >
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative w-20 h-24 lg:w-full lg:h-32 rounded-[14px] overflow-hidden border-2 transition-all duration-300 ease-out shrink-0 focus:outline-none focus:ring-2 focus:ring-[#111827] focus:ring-offset-2",
                      i === activeIndex
                        ? "border-[#111827] shadow-md"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-300",
                    )}
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={img.alt ?? `Vista ${i + 1}`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt ?? `Vista ${i + 1}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image with Hover Zoom */}
            <div
              ref={imageRef}
              className="flex-1 bg-[#FAFAFA] rounded-[18px] overflow-hidden relative cursor-crosshair aspect-square lg:aspect-[4/5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
              onClick={() => currentImage && setLightboxOpen(true)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="button"
              aria-label="Ampliar imagen"
            >
              {currentImage && !imgError ? (
                <>
                  {!imgLoaded && (
                    <div className="absolute inset-0 bg-[#FAFAFA] animate-pulse" />
                  )}
                  {allImages.map((img, idx) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.alt ?? productName}
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out",
                        activeIndex === idx ? "opacity-100 z-0" : "opacity-0 -z-10",
                      )}
                      style={
                        activeIndex === idx && isZoomed
                          ? {
                              transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                              transform: "scale(1.8)",
                            }
                          : { transform: "scale(1)" }
                      }
                      loading={idx === 0 ? "eager" : "lazy"}
                      fetchPriority={idx === 0 ? "high" : "low"}
                      onLoad={() => idx === activeIndex && setImgLoaded(true)}
                      onError={() => idx === activeIndex && setImgError(true)}
                    />
                  ))}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <Package className="size-16 text-muted-foreground/15" strokeWidth={1} />
                </div>
              )}

              {/* Discount Badge */}
              {discountPercent && discountPercent > 0 && (
                <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-white/20">
                  <span className="text-[#DC2626] font-bold text-sm tracking-wide">
                    -{discountPercent}%
                  </span>
                </div>
              )}

              {/* Badges */}
              {badges && (
                <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">{badges}</div>
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
            </div>
          </div>
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
