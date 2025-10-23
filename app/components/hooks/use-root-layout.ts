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

  // Hide inventory on shop, trades, marketplace and trade-up pages to give more space
  const hideInventoryOnShop = location.pathname === "/shop";
  const hideInventoryOnTrades =
    location.pathname === "/trades" || location.pathname.startsWith("/trades/");
  const hideInventoryOnMarketplace = location.pathname === "/marketplace";
  const hideInventoryOnTradeUp = location.pathname === "/trade-up";

  // Show case opening activity on main pages (not on auth pages, etc.)
  const showCaseOpeningActivity = ["/", "/shop", "/craft"].includes(
    location.pathname
  );

  return {
    footer: true,
    header: true,
    inventory: !hideInventoryOnShop && !hideInventoryOnTrades && !hideInventoryOnMarketplace && !hideInventoryOnTradeUp,
    caseOpeningActivity: showCaseOpeningActivity
  };
}
