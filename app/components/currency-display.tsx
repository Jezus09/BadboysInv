/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function CurrencyDisplay({ 
  amount, 
  className = "",
  showIcon = true 
}: { 
  amount: string | number | null | undefined;
  className?: string;
  showIcon?: boolean;
}) {
  const displayAmount = formatAmount(amount);
  
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {showIcon && (
        <FontAwesomeIcon 
          icon={faCoins} 
          className="h-4 w-4 text-yellow-500" 
        />
      )}
      <span className="font-mono font-bold text-yellow-400">
        ${displayAmount}
      </span>
    </span>
  );
}

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "0.00";
  }
  
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return "0.00";
  }
  
  return numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}