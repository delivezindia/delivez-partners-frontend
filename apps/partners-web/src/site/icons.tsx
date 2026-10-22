import type { SVGProps } from 'react';

// Small stroke icon set (24×24, currentColor) for the public site.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(paths: React.ReactNode) {
  return function Icon({ size = 24, ...props }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
        {paths}
      </svg>
    );
  };
}

export const IconUtensils = base(<><path d="M4 3v8a3 3 0 0 0 3 3v7" /><path d="M10 3v8" /><path d="M7 3v8" /><path d="M17 21V3c-2 1-3 3.5-3 7v4h3" /></>);
export const IconBasket = base(<><path d="M3 9h18l-2 11H5L3 9z" /><path d="M8 9l4-6 4 6" /><path d="M9 13v4M15 13v4" /></>);
export const IconPill = base(<><path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l7-7a4.95 4.95 0 0 1 7 7l-7 7z" /><path d="M8.5 8.5l7 7" /></>);
export const IconFlask = base(<><path d="M9 3h6" /><path d="M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3" /><path d="M7.5 15h9" /></>);
export const IconStore = base(<><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 12v9h14v-9" /><path d="M10 21v-5h4v5" /></>);
export const IconCart = base(<><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M3 4h2l2.5 11h11L21 7H6.5" /></>);
export const IconBike = base(<><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M5.5 17l4-8h5l4 8" /><path d="M9.5 9L8 6H5" /><path d="M14.5 9l1.5-3h2" /></>);
export const IconChat = base(<><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 10.5h7M8.5 13.5h4" /></>);
export const IconRupee = base(<><path d="M6 4h12M6 9h12" /><path d="M9 4c4 0 6 1.5 6 5s-3 5-6 5H6l8 7" /></>);
export const IconClock = base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconShield = base(<><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>);
export const IconChart = base(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>);
export const IconBell = base(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21h4" /></>);
export const IconDoc = base(<><path d="M14 3H6v18h12V7l-4-4z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>);
export const IconMap = base(<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>);
export const IconBox = base(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>);
export const IconUsers = base(<><circle cx="9" cy="8" r="3.5" /><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.8 4 3.4 4 7" /></>);
export const IconSpark = base(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></>);
export const IconCheck = base(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconArrow = base(<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>);
export const IconChevron = base(<path d="M6 9l6 6 6-6" />);
export const IconMenu = base(<><path d="M4 6h16M4 12h16M4 18h16" /></>);
export const IconClose = base(<><path d="M6 6l12 12M18 6L6 18" /></>);
export const IconGlobe = base(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" /></>);
export const IconPhone = base(<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />);
export const IconMail = base(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const IconQr = base(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4" /></>);
