import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageOrigin } from '@/lib/clickOrigin';

export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  const origin = useMemo(() => pageOrigin(), [pathname]);
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformOrigin: origin }}
    >
      {children}
    </motion.div>
  );
}