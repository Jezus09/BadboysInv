/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CSSProperties } from "react";
import { isServerContext, serverGlobals } from "~/globals";
import { useRules } from "./app-context";

export function Logo(props: { className?: string; style?: CSSProperties }) {
  const { appLogoUrl } = useRules();
  if (isServerContext) {
    const base64Url = serverGlobals.appLogoBase64Url;
    if (base64Url !== undefined && base64Url.length > 0) {
      return (
        <img
          suppressHydrationWarning
          {...props}
          src={base64Url}
          draggable={false}
        />
      );
    }
  }
  if (appLogoUrl.length > 0) {
    return (
      <img
        suppressHydrationWarning
        {...props}
        src={appLogoUrl}
        draggable={false}
      />
    );
  }
  // Default: Badboys Inventory text with CS2 font
  return (
    <div
      suppressHydrationWarning
      {...props}
      style={{
        fontFamily: "stratum2, sans-serif",
        fontSize: "1.5rem",
        fontWeight: "bold",
        background: "linear-gradient(to right, #60a5fa, #a78bfa, #ec4899)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        display: "inline-block",
        whiteSpace: "nowrap",
        ...props.style
      }}
    >
      BADBOYS INVENTORY
    </div>
  );
}
