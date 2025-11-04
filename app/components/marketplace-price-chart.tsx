/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

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

export function MarketplacePriceChart({
  itemId,
  wear,
  className = ""
}: MarketplacePriceChartProps) {
  const [priceData, setPriceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<"up" | "down" | "neutral">("neutral");
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0, change: 0 });

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
            price: parseFloat(point.price),
            fullDate: new Date(point.createdAt).toLocaleDateString("hu-HU")
          }));

          setPriceData(chartData);

          // Calculate statistics
          const prices = chartData.map((d: any) => d.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

          // Calculate trend
          if (chartData.length >= 2) {
            const firstPrice = chartData[0].price;
            const lastPrice = chartData[chartData.length - 1].price;
            const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

            setStats({
              min: minPrice,
              max: maxPrice,
              avg: avgPrice,
              change: percentChange
            });

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
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"></div>
          <div className="text-sm text-neutral-400">Loading price data...</div>
        </div>
      </div>
    );
  }

  if (priceData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
        <div className="mb-2 text-4xl opacity-20">📊</div>
        <div className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          Nincs ár előzmény
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Ez az első listing ezen az áron
        </div>
      </div>
    );
  }

  const lineColor =
    trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#94a3b8";
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-neutral-300">
          Ár Előzmény (30 nap)
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-neutral-400">
            {priceData.length}x adatpont
          </span>
          <span
            className="ml-1 text-lg font-bold"
            style={{ color: lineColor }}
          >
            {trendIcon}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded bg-black/40 p-2">
          <div className="text-[10px] font-bold uppercase text-neutral-400">
            Min
          </div>
          <div className="font-display text-sm font-bold text-blue-400">
            {stats.min.toFixed(0)} 💰
          </div>
        </div>
        <div className="rounded bg-black/40 p-2">
          <div className="text-[10px] font-bold uppercase text-neutral-400">
            Max
          </div>
          <div className="font-display text-sm font-bold text-purple-400">
            {stats.max.toFixed(0)} 💰
          </div>
        </div>
        <div className="rounded bg-black/40 p-2">
          <div className="text-[10px] font-bold uppercase text-neutral-400">
            Átlag
          </div>
          <div className="font-display text-sm font-bold text-yellow-400">
            {stats.avg.toFixed(0)} 💰
          </div>
        </div>
        <div className="rounded bg-black/40 p-2">
          <div className="text-[10px] font-bold uppercase text-neutral-400">
            Változás
          </div>
          <div
            className="font-display text-sm font-bold"
            style={{ color: lineColor }}
          >
            {stats.change > 0 ? "+" : ""}
            {stats.change.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={priceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#a3a3a3" }}
            stroke="#525252"
            tickMargin={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#a3a3a3" }}
            stroke="#525252"
            width={40}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171717",
              border: "1px solid #525252",
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px 12px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.5)"
            }}
            labelStyle={{ color: "#d4d4d4", fontWeight: "bold", marginBottom: "4px" }}
            formatter={(value: any) => [
              <span style={{ color: lineColor, fontWeight: "bold" }}>
                {value.toFixed(0)} 💰
              </span>,
              "Ár"
            ]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={3}
            dot={{
              fill: lineColor,
              strokeWidth: 2,
              r: 4,
              stroke: "#1a1a1a"
            }}
            activeDot={{
              r: 6,
              fill: lineColor,
              stroke: "#ffffff",
              strokeWidth: 2
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
