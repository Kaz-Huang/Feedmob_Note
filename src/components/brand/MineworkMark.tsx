import React from 'react';

/** FeedMob's teal plus badge, redrawn as a pixel-built Minework mark. */
export const MineworkMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="crispEdges"
  >
    <path d="M20 4H40V8H48V12H52V20H56V40H52V48H48V52H40V56H20V52H12V48H8V40H4V20H8V12H12V8H20Z" transform="translate(4 4)" fill="#00645F" />
    <path d="M20 4H40V8H48V12H52V20H56V40H52V48H48V52H40V56H20V52H12V48H8V40H4V20H8V12H12V8H20Z" fill="#00B2AA" />
    <path d="M20 4H40V8H20ZM12 8H20V12H12ZM8 12H12V20H8ZM4 20H8V36H4Z" fill="#39D4C8" />
    <path d="M52 20H56V40H52ZM48 40H52V48H48ZM40 48H48V52H40ZM20 52H40V56H20Z" fill="#00978F" />
    <path d="M16 12H20V16H16ZM8 32H12V40H8Z" fill="#1CC4B8" />
    <path d="M40 16H48V20H40ZM44 40H48V44H44Z" fill="#00A39B" />
    <path d="M24 14H36V24H46V36H36V46H24V36H14V24H24Z" transform="translate(2 2)" fill="#007E76" />
    <path d="M24 14H36V24H46V36H36V46H24V36H14V24H24Z" fill="#F4FFFC" />
    <path d="M24 14H36V18H28V24H24ZM14 24H24V28H18V36H14Z" fill="#FFFFFF" />
    <path d="M32 36H36V46H24V42H32ZM36 32H46V36H36Z" fill="#D1F3EA" />
  </svg>
);
