/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { data } from "react-router";
import type { Route } from "./+types/cs2-server._index";
import { requireUser } from "~/auth.server";
import { useTranslate, useUser } from "~/components/app-context";
import { SettingsLabel } from "~/components/settings-label";
import { EditorInput } from "~/components/editor-input";
import { EditorToggle } from "~/components/editor-toggle";
import { ApiCS2ServerUrl } from "./api.cs2-server._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return data({
    serverConfig: {
      ip: process.env.CS2_SERVER_IP || "",
      port: process.env.CS2_SERVER_PORT || "27015",
      serverName: process.env.CS2_SERVER_NAME || "CS2 Server",
      connected: false // This would be checked dynamically
    }
  });
}

export default function CS2ServerPage() {
  const { serverConfig } = useLoaderData<typeof loader>();
  const translate = useTranslate();
  const user = useUser();
  const fetcher = useFetcher();

  const [isConnected, setIsConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncOnJoin, setSyncOnJoin] = useState(true);

  useEffect(() => {
    // Check server connection status on mount
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch(ApiCS2ServerUrl);
      const data = await response.json();
      setIsConnected(data.serverConfig?.connected || false);
    } catch (error) {
      console.error("Failed to check server connection:", error);
      setIsConnected(false);
    }
  };

  const syncInventory = async () => {
    if (!user?.id) return;

    fetcher.submit(
      {
        action: "sync_inventory",
        steamId: user.id
      },
      {
        method: "POST",
        action: ApiCS2ServerUrl,
        encType: "application/json"
      }
    );
  };

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
              CS2 SERVER
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-orange-400/20 blur-sm">
              CS2 SERVER
            </div>
          </div>

          <div className="mb-4 text-center">
            <p className="font-display text-lg font-medium text-neutral-300">
              Connect your inventory to a live CS2 server
            </p>
          </div>
        </div>

        {/* Server Status */}
        <div className="mb-8 rounded-lg border border-neutral-700/50 bg-black/30 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Server Status</h2>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="font-medium text-white">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className="text-neutral-300">
              <span className="font-medium">Server:</span>{" "}
              {serverConfig.serverName}
            </div>
          </div>

          <button
            onClick={checkServerConnection}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Check Connection
          </button>
        </div>

        {/* Sync Settings */}
        <div className="mb-8 rounded-lg border border-neutral-700/50 bg-black/30 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Sync Settings</h2>

          <div className="space-y-4">
            <SettingsLabel label="Auto-sync inventory">
              <EditorToggle checked={autoSync} onChange={setAutoSync} />
            </SettingsLabel>

            <SettingsLabel label="Sync on server join">
              <EditorToggle checked={syncOnJoin} onChange={setSyncOnJoin} />
            </SettingsLabel>
          </div>
        </div>

        {/* Manual Actions */}
        <div className="mb-8 rounded-lg border border-neutral-700/50 bg-black/30 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Manual Actions</h2>

          <div className="space-y-4">
            <button
              onClick={syncInventory}
              disabled={!isConnected || fetcher.state === "submitting"}
              className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600"
            >
              {fetcher.state === "submitting"
                ? "Syncing..."
                : "Sync Inventory Now"}
            </button>

            {fetcher.data && (
              <div
                className={`rounded-lg p-3 ${fetcher.data.success ? "border border-green-500/30 bg-green-900/20 text-green-400" : "border border-red-500/30 bg-red-900/20 text-red-400"}`}
              >
                {fetcher.data.message}
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="rounded-lg border border-neutral-700/50 bg-black/30 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Setup Instructions
          </h2>

          <div className="space-y-4 text-neutral-300">
            <div>
              <h3 className="mb-2 font-bold text-white">
                1. Configure Environment Variables
              </h3>
              <p>Set these in your hosting platform (Vercel, Railway, etc.):</p>
              <div className="mt-2 rounded bg-gray-800 p-3 font-mono text-sm">
                CS2_SERVER_IP=your-server-ip
                <br />
                CS2_SERVER_PORT=27015
                <br />
                CS2_RCON_PASSWORD=your-rcon-password
                <br />
                CS2_SERVER_NAME=Your Server Name
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-white">
                2. CS2 Server Configuration
              </h3>
              <p>Add these to your CS2 server config:</p>
              <div className="mt-2 rounded bg-gray-800 p-3 font-mono text-sm">
                rcon_password "your-rcon-password"
                <br />
                sv_rcon_whitelist_address "your-hosting-ip"
                <br />
                sv_rcon_banpenalty 0<br />
                sv_rcon_maxfailures 5
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-white">3. Deploy to Cloud</h3>
              <p>Recommended hosting platforms:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <strong>Vercel:</strong> Easy deployment, free tier
                </li>
                <li>
                  <strong>Railway:</strong> Full-stack hosting with database
                </li>
                <li>
                  <strong>Netlify:</strong> Static + serverless functions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
