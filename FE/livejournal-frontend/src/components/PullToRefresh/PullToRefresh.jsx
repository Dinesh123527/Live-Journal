import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import './PullToRefresh.scss';

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const y = useMotionValue(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  // Transform pull distance to rotation for the refresh icon
  const rotate = useTransform(y, [0, MAX_PULL], [0, 360]);
  const opacity = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const scale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only allow pull-to-refresh when scrolled to the top
    if (container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (disabled || isRefreshing || !isPulling) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      y.set(0);
      return;
    }

    const touchY = e.touches[0].clientY;
    const pullDistance = touchY - touchStartY.current;

    if (pullDistance > 0) {
      // Prevent default scrolling behavior
      e.preventDefault();

      // Apply resistance to the pull
      const resistance = 0.5;
      const adjustedPull = Math.min(pullDistance * resistance, MAX_PULL);
      y.set(adjustedPull);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || !isPulling) return;

    const currentY = y.get();
    setIsPulling(false);

    if (currentY >= PULL_THRESHOLD) {
      // Trigger refresh
      setIsRefreshing(true);

      // Animate to the refreshing position
      await animate(y, PULL_THRESHOLD, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });

      // Call the refresh callback
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }

      // Wait a bit to show the animation
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsRefreshing(false);

      // Animate back to initial position
      await animate(y, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
    } else {
      // Snap back if threshold not met
      animate(y, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
    }
  };

  // Handle mouse events for desktop testing
  const handleMouseDown = (e) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    touchStartY.current = e.clientY;
    setIsPulling(true);
  };

  const handleMouseMove = (e) => {
    if (disabled || isRefreshing || !isPulling) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      y.set(0);
      return;
    }

    const pullDistance = e.clientY - touchStartY.current;

    if (pullDistance > 0) {
      const resistance = 0.5;
      const adjustedPull = Math.min(pullDistance * resistance, MAX_PULL);
      y.set(adjustedPull);
    }
  };

  const handleMouseUp = () => {
    if (isPulling) {
      handleTouchEnd();
    }
  };

  useEffect(() => {
    if (isPulling) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPulling]);

  return (
    <div className="pull-to-refresh-wrapper">
      {/* Refresh Indicator */}
      <motion.div
        className="refresh-indicator"
        style={{
          opacity,
          scale,
        }}
      >
        <motion.div
          style={{ rotate }}
          className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}
        >
          <RefreshCw size={24} />
        </motion.div>
      </motion.div>

      {/* Content Container */}
      <motion.div
        ref={containerRef}
        className="pull-to-refresh-content"
        style={{ y }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;

