/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PriceHistoryPoint {
  price: string;
  soldAt: string | null;
  createdAt: string;
}

interface MarketplacePriceChartProps {
  itemId: number;
  wear?: number;
  className?: string;
}

export function MarketplacePriceChart({ itemId, wear, className = "" }: MarketplacePriceChartProps) {
  const [priceData, setPriceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<"up" | "down" | "neutral">("neutral");

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        const response = await fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_price_history",
            itemId,
            wear,
            days: 30
          })
        });

        const data = await response.json();

        if (data.success && data.history && data.history.length > 0) {
          // Transform data for chart
          const chartData = data.history.map((point: PriceHistoryPoint) => ({
            date: new Date(point.createdAt).toLocaleDateString("hu-HU", {
              month: "short",
              day: "numeric"
            }),
            price: parseFloat(point.price)
          }));

          setPriceData(chartData);

          // Calculate trend
          if (chartData.length >= 2) {
            const firstPrice = chartData[0].price;
            const lastPrice = chartData[chartData.length - 1].price;
            const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

            if (percentChange > 5) {
              setTrend("up");
            } else if (percentChange < -5) {
              setTrend("down");
            } else {
              setTrend("neutral");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch price history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPriceHistory();
  }, [itemId, wear]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-xs text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-xs text-neutral-400">No price data</div>
      </div>
    );
  }

  const lineColor = trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#94a3b8";

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-bold text-neutral-300">PRICE TREND</span>
        <span
          className="text-[10px] font-bold"
          style={{ color: lineColor }}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {priceData.length}x
        </span>
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={priceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 8, fill: "#a3a3a3" }}
            stroke="#525252"
            hide
          />
          <YAxis
            tick={{ fontSize: 8, fill: "#a3a3a3" }}
            stroke="#525252"
            hide
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171717",
              border: "1px solid #404040",
              borderRadius: "4px",
              fontSize: "11px",
              padding: "4px 8px"
            }}
            labelStyle={{ color: "#a3a3a3" }}
            formatter={(value: any) => [`$${value.toFixed(2)}`, "Price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
