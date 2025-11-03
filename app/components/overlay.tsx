/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ReactNode, useEffect } from "react";

export function Overlay({
  className,
  children,
  isWrapperless
}: {
  className?: string;
  children: ReactNode;
  isWrapperless?: boolean;
}) {
  // Prevent body scroll when overlay is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Restore body scroll when overlay unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 z-50 flex h-full w-full items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      {isWrapperless ? children : <div className={className}>{children}</div>}
    </div>
  );
}
