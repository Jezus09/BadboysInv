/**
 * Test script to verify webhook integration
 * Run with: node test-webhook.js
 */

const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL || "http://157.173.100.82:5005";

async function testCaseOpeningWebhook() {
  console.log("\n🧪 Testing Case Opening Webhook...");
  console.log(`📡 Target: ${webhookUrl}/api/plugin/case-opened\n`);

  const testData = {
    PlayerName: "TestPlayer",
    ItemName: "AK-47 | Redline",
    Rarity: "Classified",
    StatTrak: true
  };

  console.log("📤 Sending payload:");
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${webhookUrl}/api/plugin/case-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData)
    });

    console.log(`\n✅ Response status: ${response.status}`);

    if (response.ok) {
      console.log("🎉 SUCCESS! Webhook is working!");
    } else {
      console.log(`⚠️  Server returned: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log("Response body:", text);
    }
  } catch (error) {
    console.error("\n❌ ERROR calling webhook:");
    console.error(error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Suggestion: Check if CS2 plugin server is running on port 5005");
    }
  }
}

async function testInventoryRefreshWebhook() {
  console.log("\n🧪 Testing Inventory Refresh Webhook...");
  console.log(`📡 Target: ${webhookUrl}/api/plugin/refresh-inventory\n`);

  const testData = {
    SteamId: "76561199513508022"
  };

  console.log("📤 Sending payload:");
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${webhookUrl}/api/plugin/refresh-inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData)
    });

    console.log(`\n✅ Response status: ${response.status}`);

    if (response.ok) {
      console.log("🎉 SUCCESS! Webhook is working!");
    } else {
      console.log(`⚠️  Server returned: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log("Response body:", text);
    }
  } catch (error) {
    console.error("\n❌ ERROR calling webhook:");
    console.error(error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Suggestion: Check if CS2 plugin server is running on port 5005");
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  CS2 PLUGIN WEBHOOK TEST");
  console.log("═══════════════════════════════════════════");

  await testCaseOpeningWebhook();
  console.log("\n---\n");
  await testInventoryRefreshWebhook();

  console.log("\n═══════════════════════════════════════════\n");
}

main().catch(console.error);
