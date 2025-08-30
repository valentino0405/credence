"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";

interface NavItem {
  href: string;
  label: string;
  ariaLabel?: string;
}

interface PillNavProps {
  items?: NavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  initialLoadAnimation?: boolean;
}

const PillNav: React.FC<PillNavProps> = ({ 
  items = [], 
  activeHref = "/", 
  className = "", 
  ease = "power3.easeOut", 
  baseColor = "#000", 
  pillColor = "#fff", 
  hoveredPillTextColor = "#fff", 
  pillTextColor, 
  initialLoadAnimation = true 
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState<boolean>(false);

  // Ensure we're on the client before using GSAP
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector(".pill-label") as HTMLElement;
        const white = pill.querySelector(".pill-label-hover") as HTMLElement;

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.4, ease, overwrite: "auto" }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 0.35, ease, overwrite: "auto" }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 0.35, ease, overwrite: "auto" }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document?.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    if (initialLoadAnimation) {
      const navItems = navItemsRef.current;
      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: "hidden" });
        gsap.to(navItems, { width: "auto", duration: 0.5, ease });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation, isClient]);

  const handleEnter = (i: number) => {
    if (!isClient) return;
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.22, ease, overwrite: "auto" });
  };

  const handleLeave = (i: number) => {
    if (!isClient) return;
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.18, ease, overwrite: "auto" });
  };

  const cssVars: React.CSSProperties = {
    ["--base" as string]: baseColor,
    ["--pill-bg" as string]: pillColor,
    ["--hover-text" as string]: hoveredPillTextColor,
    ["--pill-text" as string]: resolvedPillTextColor,
    ["--nav-h" as string]: "28px",
    ["--pill-pad-x" as string]: "12px",
    ["--pill-gap" as string]: "4px",
  };

  return (
    <div className={"pill-nav inline-flex items-center " + className} style={cssVars}>
      <div ref={navItemsRef} className="relative items-center rounded-full flex ml-2" style={{ height: "var(--nav-h)", background: "var(--base, #000)", alignItems: "center", justifyContent: "center" }}>
        <ul role="menubar" className="list-none flex items-center m-0 p-[3px] h-full" style={{ gap: "var(--pill-gap)", alignItems: "center" }}>
          {items.map((item, i) => {
            const isActive = activeHref === item.href;

            const pillStyle: React.CSSProperties = {
              backgroundColor: pillColor,
              color: resolvedPillTextColor,
              paddingLeft: "var(--pill-pad-x)",
              paddingRight: "var(--pill-pad-x)",
              height: "var(--nav-h)",
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              border: 'none'
            };

            const PillContent = (
              <>
                <span
                  className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                  style={{ background: "var(--base, #000)", willChange: "transform" }}
                  aria-hidden="true"
                  ref={(el) => {
                    circleRefs.current[i] = el;
                  }}
                />
                <span className="label-stack relative inline-block leading-[1] z-[2]">
                  <span 
                    className="pill-label relative z-[2] inline-block leading-[1]" 
                    style={{ willChange: "transform", color: resolvedPillTextColor }}
                  >
                    {item.label}
                  </span>
                  <span 
                    className="pill-label-hover absolute left-0 top-0 z-[3] inline-block" 
                    style={{ 
                      color: "var(--hover-text, #fff)", 
                      willChange: "transform, opacity" 
                    }} 
                    aria-hidden="true"
                  >
                    {item.label}
                  </span>
                </span>
                {isActive && (
                  <span className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 w-3 h-3 rounded-full z-[4]" style={{ background: "var(--base, #000)" }} aria-hidden="true" />
                )}
              </>
            );

            const basePillClasses = "cursor-target relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-semibold text-[12px] leading-[0] uppercase tracking-[0.2px] whitespace-nowrap cursor-pointer px-0 hover:bg-white hover:text-black";

            const handlePillMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
              const target = e.currentTarget;
              target.style.backgroundColor = '#ffffff';
              target.style.color = '#000000';
              const textElements = target.querySelectorAll('.pill-label, .pill-label-hover') as NodeListOf<HTMLElement>;
              textElements.forEach(el => {
                el.style.color = '#000000';
              });
              handleEnter(i);
            };

            const handlePillMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
              const target = e.currentTarget;
              target.style.backgroundColor = pillColor;
              target.style.color = resolvedPillTextColor;
              const textElements = target.querySelectorAll('.pill-label, .pill-label-hover') as NodeListOf<HTMLElement>;
              textElements.forEach(el => {
                el.style.color = '#ffffff';
              });
              handleLeave(i);
            };

            return (
              <li key={item.href} role="none" className="flex h-full items-center">
                <Link 
                  href={item.href} 
                  role="menuitem" 
                  className={basePillClasses} 
                  style={pillStyle} 
                  aria-label={item.ariaLabel || item.label} 
                  onMouseEnter={handlePillMouseEnter} 
                  onMouseLeave={handlePillMouseLeave}
                >
                  {PillContent}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;
