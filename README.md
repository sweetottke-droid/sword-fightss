# Swordfall: Above the Heights - multiplayer (Render)

Files: server.js, package.json, render.yaml, public/index.html, public/burn.mp3, public/dev.gif
(upload ALL of them to your GitHub repo, keeping the `public` folder).

## Put it online
1. GitHub: new repo, upload everything in this folder (the `public` folder must keep its 3 files).
2. render.com: New + > Web Service > pick the repo.
3. Runtime Node, Build Command `npm install`, Start Command `npm start`, Instance Type Free.
4. Deploy. Send the https://....onrender.com link to your friends.

## SweettDev login
The name SweettDev is password protected and already set up (no environment variable needed): type SweettDev on the start menu, enter your password and press Play.
Only a one-way fingerprint of the password is in server.js, so nobody can read it from GitHub.
The browser remembers you, so next time on the same computer you are signed in already. Use the Dev Room panel's "Sign out" button on shared computers.

## Notes
- Free plan sleeps after ~15 min idle; first visit afterwards takes about a minute.
- Leaderboard is saved in leaderboard.json on the server, and each player's browser re-sends their totals when they reconnect, so it rebuilds after a restart.
