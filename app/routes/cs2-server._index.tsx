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
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 drop-shadow-2xl">
              CS2 SERVER
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-orange-400/20 blur-sm">
              CS2 SERVER
            </div>
          </div>
          
          <div className="text-center mb-4">
            <p className="font-display text-lg text-neutral-300 font-medium">
              Connect your inventory to a live CS2 server
            </p>
          </div>
        </div>

        {/* Server Status */}
        <div className="mb-8 p-6 bg-black/30 rounded-lg border border-neutral-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Server Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="text-neutral-300">
              <span className="font-medium">Server:</span> {serverConfig.serverName}
            </div>
          </div>

          <button
            onClick={checkServerConnection}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Check Connection
          </button>
        </div>

        {/* Sync Settings */}
        <div className="mb-8 p-6 bg-black/30 rounded-lg border border-neutral-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Sync Settings</h2>
          
          <div className="space-y-4">
            <SettingsLabel label="Auto-sync inventory">
              <EditorToggle checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            </SettingsLabel>
            
            <SettingsLabel label="Sync on server join">
              <EditorToggle checked={syncOnJoin} onChange={(e) => setSyncOnJoin(e.target.checked)} />
            </SettingsLabel>
          </div>
        </div>

        {/* Manual Actions */}
        <div className="mb-8 p-6 bg-black/30 rounded-lg border border-neutral-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Manual Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={syncInventory}
              disabled={!isConnected || fetcher.state === "submitting"}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {fetcher.state === "submitting" ? "Syncing..." : "Sync Inventory Now"}
            </button>
            
            {fetcher.data && (
              <div className={`p-3 rounded-lg ${fetcher.data.success ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/30 text-red-400'}`}>
                {fetcher.data.message}
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="p-6 bg-black/30 rounded-lg border border-neutral-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Setup Instructions</h2>
          
          <div className="space-y-4 text-neutral-300">
            <div>
              <h3 className="font-bold text-white mb-2">1. Configure Environment Variables</h3>
              <p>Set these in your hosting platform (Vercel, Railway, etc.):</p>
              <div className="mt-2 p-3 bg-gray-800 rounded font-mono text-sm">
                CS2_SERVER_IP=your-server-ip<br/>
                CS2_SERVER_PORT=27015<br/>
                CS2_RCON_PASSWORD=your-rcon-password<br/>
                CS2_SERVER_NAME=Your Server Name
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">2. CS2 Server Configuration</h3>
              <p>Add these to your CS2 server config:</p>
              <div className="mt-2 p-3 bg-gray-800 rounded font-mono text-sm">
                rcon_password "your-rcon-password"<br/>
                sv_rcon_whitelist_address "your-hosting-ip"<br/>
                sv_rcon_banpenalty 0<br/>
                sv_rcon_maxfailures 5
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">3. Deploy to Cloud</h3>
              <p>Recommended hosting platforms:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Vercel:</strong> Easy deployment, free tier</li>
                <li><strong>Railway:</strong> Full-stack hosting with database</li>
                <li><strong>Netlify:</strong> Static + serverless functions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}