/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from "@ianlucas/cs2-lib";

// CS2 Server Configuration
export const CS2_SERVER_CONFIG = {
  ip: process.env.CS2_SERVER_IP || "localhost",
  port: parseInt(process.env.CS2_SERVER_PORT || "27015"),
  rconPassword: process.env.CS2_RCON_PASSWORD || "",
  serverName: process.env.CS2_SERVER_NAME || "CS2 Server"
};

/**
 * CS2 Server Integration Functions
 */

// RCON connection for server commands
export class CS2ServerConnection {
  private host: string;
  private port: number;
  private password: string;

  constructor(host: string, port: number, password: string) {
    this.host = host;
    this.port = port;
    this.password = password;
  }

  /**
   * Send RCON command to CS2 server
   */
  async sendCommand(command: string): Promise<string> {
    try {
      // Implement RCON protocol here
      // This is a placeholder - you'll need to implement actual RCON
      console.log(`Sending command to ${this.host}:${this.port}: ${command}`);
      return "Command sent successfully";
    } catch (error) {
      console.error("Failed to send command to CS2 server:", error);
      throw error;
    }
  }

  /**
   * Give items to player on CS2 server
   */
  async givePlayerItem(steamId: string, itemName: string): Promise<boolean> {
    try {
      const command = `give_player_item ${steamId} ${itemName}`;
      await this.sendCommand(command);
      return true;
    } catch (error) {
      console.error("Failed to give player item:", error);
      return false;
    }
  }

  /**
   * Sync player inventory with CS2 server
   */
  async syncPlayerInventory(
    steamId: string,
    inventory: any[]
  ): Promise<boolean> {
    try {
      // Clear player inventory first
      await this.sendCommand(`clear_inventory ${steamId}`);

      // Give each item
      for (const item of inventory) {
        await this.givePlayerItem(steamId, this.convertToCS2ItemName(item));
      }

      return true;
    } catch (error) {
      console.error("Failed to sync player inventory:", error);
      return false;
    }
  }

  /**
   * Convert inventory simulator item to CS2 server item name
   */
  private convertToCS2ItemName(item: any): string {
    // This mapping depends on your CS2 server's item naming convention
    // Example mappings:
    const itemMappings: { [key: number]: string } = {
      1: "weapon_ak47",
      4: "weapon_ak47_asiimov",
      7: "weapon_awp"
      // Add more mappings based on your server's items
    };

    return itemMappings[item.id] || `item_${item.id}`;
  }
}

// Initialize CS2 server connection
export const cs2Server = new CS2ServerConnection(
  CS2_SERVER_CONFIG.ip,
  CS2_SERVER_CONFIG.port,
  CS2_SERVER_CONFIG.rconPassword
);

/**
 * Webhook handlers for CS2 server events
 */
export const cs2ServerWebhooks = {
  /**
   * Handle player connect event
   */
  onPlayerConnect: async (steamId: string) => {
    console.log(`Player connected: ${steamId}`);
    // Sync their inventory when they connect
    // Implementation depends on your needs
  },

  /**
   * Handle player disconnect event
   */
  onPlayerDisconnect: async (steamId: string) => {
    console.log(`Player disconnected: ${steamId}`);
  },

  /**
   * Handle item pickup/drop events
   */
  onItemEvent: async (
    steamId: string,
    itemId: string,
    action: "pickup" | "drop"
  ) => {
    console.log(`Player ${steamId} ${action} item ${itemId}`);
    // Update inventory simulator accordingly
  }
};
