/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, { CSSProperties } from "react";

export function Logo(props: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`font-display flex items-center justify-center gap-2 ${
        props.className || ""
      }`}
      style={props.style}
    >
      <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-2xl font-black text-transparent drop-shadow-lg">
        Badboys
      </span>
      <span className="text-xl font-bold text-white">Inventory</span>
    </div>
  );
}

export default Logo;
