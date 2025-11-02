# BadBoys Rank System - API Reference

Quick reference for CS2 Plugin developers.

---

## Base URL

```
https://inventory.badboyscs2.site
```

---

## Public Endpoints

### 1. Get Leaderboard

```http
GET /api/leaderboard?type=rank&limit=100
```

**Query Parameters:**
- `type` - `rank` | `kills` | `kd` (default: `rank`)
- `limit` - Number (1-500, default: 100)

**Response:**
```json
{
  "success": true,
  "type": "rank",
  "limit": 100,
  "count": 100,
  "leaderboard": [
    {
      "position": 1,
      "steamId": "76561198012345678",
      "playerName": "Jézus",
      "rankName": "Global Elite",
      "rankTag": "[GE]",
      "rankColor": "#FF0000",
      "experience": 45000,
      "kills": 5000,
      "deaths": 2000,
      "kdRatio": 2.5,
      "headshotPercentage": 55.2
    }
  ]
}
```

---

### 2. Get Player Stats

```http
GET /api/player/:steamid
```

**Example:**
```http
GET /api/player/76561198012345678
```

**Response:**
```json
{
  "success": true,
  "player": {
    "steamId": "76561198012345678",
    "playerName": "Jézus",
    "rankId": 18,
    "rankName": "Supreme Master First Class",
    "rankTag": "[SMFC]",
    "rankColor": "#FF1493",
    "experience": 35000,
    "kills": 3500,
    "deaths": 1500,
    "kdRatio": 2.33,
    "headshotPercentage": 48.5,
    "minExperience": 32000,
    "maxExperience": 39999
  }
}
```

**404 Response:**
```json
{
  "success": false,
  "error": "Player not found"
}
```

---

### 3. Get All Ranks

```http
GET /api/ranks
```

**Response:**
```json
{
  "success": true,
  "count": 19,
  "ranks": [
    {
      "id": 1,
      "rankName": "Unranked",
      "rankTag": "[UR]",
      "minExperience": 0,
      "maxExperience": 99,
      "rankColor": "#808080",
      "playerCount": 150
    },
    {
      "id": 2,
      "rankName": "Silver I",
      "rankTag": "[S1]",
      "minExperience": 100,
      "maxExperience": 299,
      "rankColor": "#C0C0C0",
      "playerCount": 80
    }
  ]
}
```

---

## Admin Endpoints

**All admin endpoints require authentication.**

Add this header to admin requests:
```http
Cookie: session=<your-session-cookie>
```

Or check if player is admin first:

---

### 4. Check Admin Status

```http
GET /api/admin/check/:steamid
```

**Example:**
```http
GET /api/admin/check/76561198012345678
```

**Response (Admin):**
```json
{
  "success": true,
  "isAdmin": true,
  "admin": {
    "steamId": "76561198012345678",
    "adminRole": "admin",
    "flags": "ban,kick,mute,give_xp",
    "isActive": true,
    "createdAt": "2025-11-01T10:00:00.000Z"
  }
}
```

**Response (Not Admin):**
```json
{
  "success": true,
  "isAdmin": false,
  "admin": null
}
```

---

### 5. Get All Players

```http
GET /api/admin/rank-players?limit=1000
```

**Query Parameters:**
- `limit` - Number (1-5000, default: 1000)

**Response:**
```json
{
  "success": true,
  "count": 500,
  "players": [
    {
      "steamId": "76561198012345678",
      "playerName": "Jézus",
      "rankId": 15,
      "experience": 22000,
      "kills": 2500,
      "deaths": 1200,
      "kdRatio": 2.08,
      "headshotPercentage": 50.2,
      "createdAt": "2025-10-01T10:00:00.000Z",
      "updatedAt": "2025-11-02T15:30:00.000Z",
      "rank": {
        "id": 15,
        "rankName": "Legendary Eagle",
        "rankTag": "[LE]",
        "rankColor": "#9370DB",
        "minExperience": 20500,
        "maxExperience": 25499
      }
    }
  ]
}
```

---

### 6. Give XP to Player

```http
POST /api/admin/give-xp
Content-Type: application/json
```

**Body:**
```json
{
  "steamId": "76561198012345678",
  "xpAmount": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gave 500 XP to 76561198012345678"
}
```

**Notes:**
- `xpAmount` can be negative to remove XP
- Automatically updates rank if XP crosses threshold
- Logs action in `admin_logs` table

---

### 7. Ban Player

```http
POST /api/admin/ban
Content-Type: application/json
```

**Body (Permanent Ban):**
```json
{
  "steamId": "76561198012345678",
  "reason": "Cheating"
}
```

**Body (Temporary Ban):**
```json
{
  "steamId": "76561198012345678",
  "reason": "Toxic behavior",
  "expiresAt": "2025-11-10T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Banned 76561198012345678",
  "ban": {
    "id": "uuid-here",
    "steamId": "76561198012345678",
    "bannedBy": "76561198087654321",
    "reason": "Cheating",
    "bannedAt": "2025-11-02T15:45:00.000Z",
    "expiresAt": null,
    "isActive": true
  }
}
```

---

### 8. Unban Player

```http
POST /api/admin/unban
Content-Type: application/json
```

**Body:**
```json
{
  "steamId": "76561198012345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unbanned 76561198012345678"
}
```

**Notes:**
- Sets all active bans for that Steam ID to `isActive: false`
- Logs action in `admin_logs` table

---

### 9. Get Active Bans

```http
GET /api/admin/bans
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "bans": [
    {
      "id": "uuid-here",
      "steamId": "76561198012345678",
      "bannedBy": "76561198087654321",
      "reason": "Cheating",
      "bannedAt": "2025-11-02T15:45:00.000Z",
      "expiresAt": null,
      "isActive": true
    }
  ]
}
```

---

### 10. Get All Admins

```http
GET /api/admin/admins
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "admins": [
    {
      "steamId": "76561198012345678",
      "adminRole": "superadmin",
      "flags": "all",
      "isActive": true,
      "createdAt": "2025-10-01T10:00:00.000Z",
      "updatedAt": "2025-10-01T10:00:00.000Z"
    }
  ]
}
```

---

### 11. Add Admin

```http
POST /api/admin/admins
Content-Type: application/json
```

**Body:**
```json
{
  "steamId": "76561198099999999",
  "adminRole": "moderator",
  "flags": "mute,kick"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added admin 76561198099999999",
  "admin": {
    "steamId": "76561198099999999",
    "adminRole": "moderator",
    "flags": "mute,kick",
    "isActive": true,
    "createdAt": "2025-11-02T16:00:00.000Z",
    "updatedAt": "2025-11-02T16:00:00.000Z"
  }
}
```

**Admin Roles:**
- `moderator` - Basic moderation
- `admin` - Full moderation
- `superadmin` - All permissions

**Common Flags:**
- `ban` - Can ban players
- `kick` - Can kick players
- `mute` - Can mute players
- `give_xp` - Can give/remove XP
- `manage_admins` - Can add/remove admins
- `all` - All permissions

---

### 12. Get Admin Logs

```http
GET /api/admin/logs?limit=100
```

**Query Parameters:**
- `limit` - Number (1-500, default: 100)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "logs": [
    {
      "id": "uuid-here",
      "adminSteamId": "76561198012345678",
      "actionType": "BAN",
      "targetSteamId": "76561198099999999",
      "actionDetails": "Reason: Cheating, Expires: Never",
      "createdAt": "2025-11-02T15:45:00.000Z"
    },
    {
      "id": "uuid-here",
      "adminSteamId": "76561198012345678",
      "actionType": "GIVE_XP",
      "targetSteamId": "76561198088888888",
      "actionDetails": "XP: 500, New Total: 25500",
      "createdAt": "2025-11-02T14:30:00.000Z"
    },
    {
      "id": "uuid-here",
      "adminSteamId": "76561198012345678",
      "actionType": "UNBAN",
      "targetSteamId": "76561198077777777",
      "actionDetails": null,
      "createdAt": "2025-11-02T13:15:00.000Z"
    }
  ]
}
```

**Action Types:**
- `BAN`
- `UNBAN`
- `GIVE_XP`
- `ADD_ADMIN`
- `REMOVE_ADMIN`
- `KICK`
- `MUTE`
- `UNMUTE`

---

## Error Responses

### 401 Unauthorized (Admin endpoint without permission)
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Not Found"
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method Not Allowed"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Plugin Integration Example (C#)

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

public class RankSystemAPI
{
    private readonly HttpClient _httpClient;
    private const string BASE_URL = "https://inventory.badboyscs2.site";

    public RankSystemAPI()
    {
        _httpClient = new HttpClient();
    }

    // Get player stats
    public async Task<PlayerStats> GetPlayerStats(string steamId)
    {
        var response = await _httpClient.GetAsync($"{BASE_URL}/api/player/{steamId}");
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<ApiResponse<PlayerStats>>(json);
        return data.player;
    }

    // Check if player is banned
    public async Task<bool> IsPlayerBanned(string steamId)
    {
        var response = await _httpClient.GetAsync($"{BASE_URL}/api/admin/bans");
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<BansResponse>(json);

        return data.bans.Any(b => b.steamId == steamId && b.isActive);
    }

    // Check if player is admin
    public async Task<bool> IsPlayerAdmin(string steamId)
    {
        var response = await _httpClient.GetAsync($"{BASE_URL}/api/admin/check/{steamId}");
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<AdminCheckResponse>(json);
        return data.isAdmin;
    }

    // Update player stats (you'll need to implement this endpoint)
    public async Task UpdatePlayerStats(string steamId, int kills, int deaths, int experience)
    {
        // TODO: Implement stats update endpoint
    }
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding:
- Max 100 requests per minute per IP
- Max 10 admin actions per minute

---

## Testing with curl

```bash
# Get leaderboard
curl https://inventory.badboyscs2.site/api/leaderboard?type=rank

# Get player
curl https://inventory.badboyscs2.site/api/player/76561198012345678

# Get ranks
curl https://inventory.badboyscs2.site/api/ranks

# Check admin (with session cookie)
curl -b "session=YOUR_SESSION_COOKIE" \
  https://inventory.badboyscs2.site/api/admin/check/76561198012345678

# Give XP (with session cookie)
curl -X POST \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{"steamId":"76561198012345678","xpAmount":500}' \
  https://inventory.badboyscs2.site/api/admin/give-xp
```

---

## Questions?

Check `RANK_SYSTEM_DEPLOYMENT.md` for full deployment guide.
