# Owner-Only Craft System Setup

This version of the CS2 Inventory Simulator has been modified to restrict the craft system to only the owner.

## Setup Instructions

### 1. Find Your Steam ID64

You need to get your Steam ID64 (17-digit number) to set as the owner:

1. Go to [SteamDB Calculator](https://steamdb.info/calculator/)
2. Enter your Steam profile URL or username
3. Copy the **steamID64** value (it will look like: `76561198XXXXXXXXX`)

### 2. Set the Owner Steam ID

You have two options to set the owner Steam ID:

#### Option A: Using Database (Recommended)

1. Access your database (PostgreSQL)
2. Connect to the database and run this SQL command:

```sql
INSERT INTO "Rule" (name, type, value)
VALUES ('ownerSteamId', 'string', 'YOUR_STEAM_ID64_HERE')
ON CONFLICT (name)
DO UPDATE SET value = 'YOUR_STEAM_ID64_HERE';
```

Replace `YOUR_STEAM_ID64_HERE` with your actual Steam ID64.

#### Option B: Using Admin Interface (if available)

If you have admin access to the rules system:

1. Go to your admin panel
2. Find the `ownerSteamId` rule
3. Set the value to your Steam ID64

### 3. Restart the Application

After setting the owner Steam ID, restart your application:

```bash
npm run build
npm run start
```

## How It Works

- Only the user with the specified Steam ID64 can access the craft system
- The "Craft Item" button in the header is completely hidden for non-owners
- Non-owner users will see "Access Denied" messages if they somehow access craft pages
- All craft-related API endpoints are protected

## Verification

1. Sign in with the owner Steam account - you should see the "Craft Item" button and have full access to crafting
2. Sign in with any other Steam account - the "Craft Item" button should be completely hidden
3. Non-authenticated users also cannot see the craft button

## Security Notes

- The owner check is enforced both on the frontend (UI) and backend (API)
- Even if someone bypasses the frontend restrictions, the backend will still deny access
- The owner Steam ID is stored securely in the database rules system

## Troubleshooting

If crafting is not working for the owner:

1. Verify the Steam ID64 is correct (17 digits, starts with 7656119)
2. Check that the rule was properly set in the database
3. Ensure you're signed in with the correct Steam account
4. Restart the application after making changes
