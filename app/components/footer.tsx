/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ClientOnly } from "remix-utils/client-only";
import { DEFAULT_APP_FOOTER_NAME } from "~/app-defaults";
import { isOurHostname } from "~/utils/misc";
import { useRules } from "./app-context";

export function Footer() {
  const { sourceCommit, appFooterName } = useRules();

  return (
    <footer className="fixed bottom-0 left-0 right-0 py-3 text-sm text-neutral-400 select-none z-10">
      <div className="text-center">
        <div className="mb-1">
          &copy; {new Date().getFullYear()} Badboys Inventory
        </div>
        <div className="text-xs">
          Found an issue?{" "}
          <span className="underline cursor-pointer hover:text-blue-500">
            Report it here
          </span>
          .
        </div>
      </div>
    </footer>
  );
}
