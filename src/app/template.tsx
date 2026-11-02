"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Iris } from "@/components/lego/Iris";

/** Runs on every navigation: a brick wall with an old-cartoon iris opens on the new page, and the camera eases back. */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const path = usePathname();
  return (
    <>
      {!reduce && <Iris key={path} />}
      <motion.div
        initial={reduce ? false : { scale: 1.06, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
