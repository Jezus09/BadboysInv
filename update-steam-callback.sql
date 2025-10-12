-- Steam Callback URL frissítése az adatbázisban
-- CS2 Inventory Simulator production setup

-- Először nézzük meg mi van jelenleg
SELECT name, value FROM rule WHERE name = 'steamCallbackUrl';

-- Ha létezik, akkor frissítjük
UPDATE rule 
SET value = 'https://cs2badboysinv.koyeb.app/sign-in/steam/callback'
WHERE name = 'steamCallbackUrl';

-- Ha nem létezik, akkor létrehozzuk
INSERT INTO rule (name, value) 
SELECT 'steamCallbackUrl', 'https://cs2badboysinv.koyeb.app/sign-in/steam/callback'
WHERE NOT EXISTS (
    SELECT 1 FROM rule WHERE name = 'steamCallbackUrl'
);

-- Ellenőrizzük az eredményt
SELECT name, value FROM rule WHERE name = 'steamCallbackUrl';

-- További Steam-related rules ellenőrzése
SELECT name, value FROM rule WHERE name LIKE '%steam%';