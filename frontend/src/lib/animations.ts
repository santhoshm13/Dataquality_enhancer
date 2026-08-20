import type { Variants } from 'framer-motion';

// Standard premium easing curve (soft landing)
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

// Staggered fade and slide up for lists/text
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

export const slideUpFade: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: standardEasing
    }
  }
};

// Smooth section transition
export const sectionTransition: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.8, 
      ease: standardEasing 
    }
  }
};

// Micro-interactions for hoverable elements (cards, buttons)
export const hoverScale = {
  rest: { scale: 1, y: 0, boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.0)" },
  hover: { 
    scale: 1.02, 
    y: -2,
    boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.15)",
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  }
};
