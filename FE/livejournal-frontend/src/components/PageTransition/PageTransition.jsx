import { motion } from 'framer-motion';

// iOS-like page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.95,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: -100,
    scale: 0.95,
  },
};

const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// Fade variant for less intrusive transitions
const fadeVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

const fadeTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};

const PageTransition = ({
  children,
  variant = 'slide', // 'slide' or 'fade'
}) => {
  const variants = variant === 'fade' ? fadeVariants : pageVariants;
  const transition = variant === 'fade' ? fadeTransition : pageTransition;

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={variants}
      transition={transition}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;

