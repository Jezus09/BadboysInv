/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useLocation } from "react-router";

export function useRootLayout(): {
  footer?: boolean;
  header?: boolean;
  inventory?: boolean;
  caseOpeningActivity?: boolean;
} {
  const location = useLocation();

  // Hide inventory on shop and trades pages to give more space
  const hideInventoryOnShop = location.pathname === "/shop";
  const hideInventoryOnTrades = location.pathname === "/trades" || location.pathname.startsWith("/trades/");
  const hideInventoryOnRanks = location.pathname === "/ranks";
  const hideInventoryOnLeaderboard = location.pathname === "/leaderboard";
  const hideInventoryOnAdmin = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  // Show case opening activity on main pages (not on auth, admin, ranks, leaderboard pages, etc.)
  const showCaseOpeningActivity = ["/", "/shop", "/craft"].includes(location.pathname) &&
    !location.pathname.startsWith("/admin") &&
    location.pathname !== "/ranks" &&
    location.pathname !== "/leaderboard";

  return {
    footer: true,
    header: true,
    inventory: !hideInventoryOnShop && !hideInventoryOnTrades && !hideInventoryOnRanks && !hideInventoryOnLeaderboard && !hideInventoryOnAdmin,
    caseOpeningActivity: showCaseOpeningActivity
  };
}
