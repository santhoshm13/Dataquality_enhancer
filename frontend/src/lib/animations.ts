import type { Variants } from 'framer-motion';

// Standard premium easing curve (soft landing per taste-skill)
export const standardEasing = [0.16, 1, 0.3, 1] as const;

// Drift animation for hero floating elements
export const floatVariant: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 5,
      ease: "easeInOut",
      repeat: Infinity,
    }
  }
};

// Staggered fade and zoom container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    }
  }
};

// Scroll Zoom-In & Zoom-Out for cards and boxes (fires smoothly as user scrolls in and out)
export const scrollZoomBox: Variants = {
  hidden: {
    scale: 0.88,
    opacity: 0.2,
    y: 25,
    filter: "blur(2px)"
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.65,
      ease: standardEasing
    }
  }
};

// Scroll Zoom-In for larger section containers
export const scrollZoomSection: Variants = {
  hidden: {
    scale: 0.92,
    opacity: 0.25,
    y: 35
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: standardEasing
    }
  }
};

// Gentle slide up with soft fade
export const slideUpFade: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: standardEasing
    }
  }
};

// Smooth section transition
export const sectionTransition: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      duration: 0.8, 
      ease: standardEasing 
    }
  }
};

// Micro-interactions on hover (scale up with luminous shadow)
export const hoverScale = {
  rest: { scale: 1, y: 0, boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)" },
  hover: { 
    scale: 1.03, 
    y: -3,
    boxShadow: "0px 16px 36px -10px rgba(99, 102, 241, 0.25)",
    transition: { type: "spring" as const, stiffness: 350, damping: 22 }
  }
};
