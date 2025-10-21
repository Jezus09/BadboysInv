# CS2 Inventory Simulator - Production Deployment Guide

## 🚀 Quick Deployment Options

### 1. Vercel (Recommended - Free)

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
cd c:\xampp\htdocs\cs2-inventory-simulator-2.11.0
vercel --prod
```

**Environment Variables in Vercel:**

```
SESSION_SECRET=your-super-secret-key-here
STEAM_API_KEY=your-steam-api-key
STEAM_CALLBACK_URL=https://your-app.vercel.app/auth/steam/callback
CS2_SERVER_IP=your-cs2-server-ip
CS2_SERVER_PORT=27015
CS2_RCON_PASSWORD=your-rcon-password
CS2_SERVER_NAME=Your CS2 Server Name
DATABASE_URL=postgresql://user:pass@host:port/db
```

### 2. Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 3. Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=build
```

## 🔧 CS2 Server Configuration

### Server Config (server.cfg)

```cfg
// RCON Configuration
rcon_password "your-rcon-password"
sv_rcon_whitelist_address "your-hosting-ip"
sv_rcon_banpenalty 0
sv_rcon_maxfailures 5

// Server Settings
hostname "Your CS2 Server + Inventory Sync"
sv_password ""
sv_cheats 0

// Inventory Integration
exec inventory_sync.cfg
```

### Inventory Sync Config (inventory_sync.cfg)

```cfg
// Custom commands for inventory management
alias "sync_inventory" "echo Syncing inventory for player"
alias "give_player_item" "echo Giving item to player"
alias "clear_inventory" "echo Clearing player inventory"

// Webhook URLs (replace with your deployed app URL)
sv_webhook_url "https://your-app.vercel.app/api/cs2-server"
```

## 📋 Setup Steps

### Step 1: Get Steam API Key

1. Go to https://steamcommunity.com/dev/apikey
2. Register your domain name
3. Copy the API key

### Step 2: Prepare Environment

```bash
# Copy environment example
cp .env.example .env

# Edit with your values
SESSION_SECRET=generate-a-random-32-character-string
STEAM_API_KEY=your-steam-api-key-from-step-1
STEAM_CALLBACK_URL=https://your-domain.com/auth/steam/callback
CS2_SERVER_IP=123.456.789.012
CS2_SERVER_PORT=27015
CS2_RCON_PASSWORD=your-secure-rcon-password
CS2_SERVER_NAME=My CS2 Server
```

### Step 3: Database Setup (Optional - for persistent data)

```bash
# If using PostgreSQL
DATABASE_URL=postgresql://username:password@hostname:port/database

# If using SQLite (default)
# No DATABASE_URL needed - uses local file
```

### Step 4: Deploy

Choose one deployment method above and follow the instructions.

### Step 5: Configure CS2 Server

1. Add the RCON settings to your CS2 server config
2. Restart your CS2 server
3. Test the connection from the web interface

## 🔌 Integration Features

### Automatic Features

- **Player Connect Sync**: Inventory syncs when players join your CS2 server
- **Real-time Updates**: Items given/removed in the simulator appear on the server
- **Trade Integration**: Completed trades automatically sync to the server

### Manual Features

- **Sync Button**: Force sync inventory from web interface
- **Server Status**: Check connection status in real-time
- **Item Management**: Give specific items to players

## 🛠 Troubleshooting

### Common Issues

**RCON Connection Failed**

- Check your CS2 server RCON password
- Verify the server IP and port
- Ensure your hosting platform IP is whitelisted

**Steam Authentication Failed**

- Verify STEAM_API_KEY is correct
- Check STEAM_CALLBACK_URL matches your domain exactly
- Ensure Steam API key domain matches your deployment

**Database Connection Issues**

- Verify DATABASE_URL format
- Check database credentials
- Ensure database allows connections from your hosting platform

### Testing Local Development

```bash
# Start development server
npm run dev

# Test CS2 server connection
curl -X POST http://localhost:5173/api/cs2-server \
  -H "Content-Type: application/json" \
  -d '{"action":"sync_inventory","steamId":"76561198000000000"}'
```

## 📊 Monitoring

### Logs to Watch

- RCON connection attempts
- Inventory sync events
- Player connect/disconnect events
- Steam authentication events

### Performance Metrics

- Response times for RCON commands
- Successful sync rates
- Player connection counts

## 🔒 Security Considerations

### Required Security Measures

- Use strong SESSION_SECRET (32+ characters)
- Secure RCON password
- Whitelist hosting platform IPs only
- Enable HTTPS on your domain
- Regular backup of database

### Recommended Security

- Rate limiting for API endpoints
- Input validation for all RCON commands
- Logging of all server interactions
- Regular security updates

## 📞 Support

If you need help with deployment:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test CS2 server RCON connection manually
4. Check hosting platform logs for errors

Your CS2 Inventory Simulator will be live and connected to your server! 🎉
