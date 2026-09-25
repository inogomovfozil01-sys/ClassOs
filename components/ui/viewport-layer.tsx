"use client";

import { ComponentProps, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Fixed overlays must escape cards whose backdrop-filter creates a containing block.
export function ViewportLayer(props: ComponentProps<"div">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted
    ? createPortal(
        <div {...props} className={`viewport-layer ${props.className || ""}`} />,
        document.body,
      )
    : null;
}
