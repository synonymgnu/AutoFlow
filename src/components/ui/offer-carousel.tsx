"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Tag
} from "lucide-react"

import { cn } from "@/lib/utils"

export interface Offer {
    id: string | number;
    imageSrc: string;
    imageAlt: string;
    tag: string;
    title: string;
    description: string;
    brandLogoSrc?: string;
    brandName: string;
    promoCode?: string;
    href: string;
}

interface OfferCardProps {
    offer: Offer;
  }
  
  const OfferCard = React.forwardRef<HTMLAnchorElement, OfferCardProps>(
    ({ offer }, ref) => (
      <motion.a
        ref={ref}
        href={offer.href}
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="group relative flex h-[370px] w-[285px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151515]"
      >
        <div className="relative h-[48%] overflow-hidden">
          <img
            src={offer.imageSrc}
            alt={offer.imageAlt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
  
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Tag className="h-3.5 w-3.5 text-[#f5c400]" />
            {offer.tag}
          </div>
  
          <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent" />
        </div>
  
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="space-y-2">
            <h3 className="text-lg font-bold leading-tight text-white">
              {offer.title}
            </h3>
  
            <p className="line-clamp-2 text-sm leading-relaxed text-white/55">
              {offer.description}
            </p>
          </div>
  
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              {offer.brandLogoSrc ? (
                <img
                  src={offer.brandLogoSrc}
                  alt={offer.brandName}
                  loading="lazy"
                  className="h-9 w-9 rounded-full bg-white/10 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5c400]/10 text-[#f5c400]">
                  <Tag className="h-4 w-4" />
                </div>
              )}
  
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {offer.brandName}
                </p>
  
                {offer.promoCode && (
                  <p className="text-xs text-white/45">
                    {offer.promoCode}
                  </p>
                )}
              </div>
            </div>
  
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5c400] text-black transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </motion.a>
    )
  );
  
  OfferCard.displayName = "OfferCard";
  
  export interface OfferCarouselProps
    extends React.HTMLAttributes<HTMLDivElement> {
    offers: Offer[];
  }
  
  const OfferCarousel = React.forwardRef<HTMLDivElement, OfferCarouselProps>(
    ({ offers, className, ...props }, ref) => {
      const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
      const scroll = (direction: "left" | "right") => {
        const container = scrollContainerRef.current;
  
        if (!container) return;
  
        container.scrollBy({
          left:
            direction === "left"
              ? -container.clientWidth * 0.8
              : container.clientWidth * 0.8,
          behavior: "smooth",
        });
      };
  
      if (!offers.length) return null;
  
      return (
        <div
          ref={ref}
          className={cn("group/carousel relative w-full", className)}
          {...props}
        >
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Ver ofertas anteriores"
            className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#202020]/90 text-white shadow-lg backdrop-blur transition hover:bg-[#f5c400] hover:text-black md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
  
          <div
            ref={scrollContainerRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
  
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Ver próximas ofertas"
            className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#202020]/90 text-white shadow-lg backdrop-blur transition hover:bg-[#f5c400] hover:text-black md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      );
    }
  );
  
  OfferCarousel.displayName = "OfferCarousel";
  
  export { OfferCarousel, OfferCard };