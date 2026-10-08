# Swordfall: Above the Heights - multiplayer (Render)

Files: server.js, package.json, render.yaml, public/index.html, public/burn.mp3, public/dev.gif
(upload ALL of them to your GitHub repo, keeping the `public` folder).

## Put it online
1. GitHub: new repo, upload everything in this folder (the `public` folder must keep its 3 files).
2. render.com: New + > Web Service > pick the repo.
3. Runtime Node, Build Command `npm install`, Start Command `npm start`, Instance Type Free.
4. Deploy. Send the https://....onrender.com link to your friends.

## SweettDev login
The name SweettDev is password protected. In Render: your service > Environment > add `DEV_KEY` = the SweettDev password (never put it in a file). Save and let it restart.
On the start menu type SweettDev, enter the password, press Play. The browser remembers you (a token, not the password), so next time on the same computer you are signed in already.
Use the Dev Room panel's "Sign out" button on shared computers. Everyone else starts with a random name.

## Notes
- Free plan sleeps after ~15 min idle; first visit afterwards takes about a minute.
- Leaderboard is saved in leaderboard.json on the server, and each player's browser re-sends their totals when they reconnect, so it rebuilds after a restart.
