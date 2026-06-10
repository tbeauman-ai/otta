# WebSocket Notifications — Doc Frontend

## Installation

```bash
npm install socket.io-client
```

## Connexion au serveur

```js
import { io } from 'socket.io-client'

const socket = io(
    process.env.NEXT_PUBLIC_BACKEND_URL, 
    {
    rejectUnauthorized: false // ignore le certificat auto-signé en local
})

socket.on('connect', () => console.log('WebSocket connecté ✅'))
socket.on('disconnect', () => console.log('WebSocket déconnecté ❌'))
```

---

## Format des événements

Tous les events suivent le format : `"Model:operation"`

```
payload = {
    model     : string   // "User", "Game", "Card"...
    operation : string   // "create", "update", "delete"...
    data      : object   // les données retournées par Prisma
}
```

---

## Événements disponibles

### Utilisateurs

```js
// Nouvel utilisateur inscrit
socket.on('User:create', (payload) => {
    console.log('Nouvel utilisateur :', payload.data)
    // payload.data = { id, username, createdAt }
})

// Connexion d'un utilisateur (émis manuellement dans la route /login)
socket.on('User:login', (payload) => {
    console.log('Utilisateur connecté :', payload.username)
    // payload = { username: "testuser" }
})
```

### Parties

```js
socket.on('Game:create', (payload) => {
    console.log('Nouvelle partie créée :', payload.data)
})

socket.on('Game:update', (payload) => {
    console.log('Partie mise à jour :', payload.data)
})

socket.on('Game:delete', (payload) => {
    console.log('Partie supprimée :', payload.data)
})
```

### Cards / Heroes

```js
socket.on('Card:create', (payload) => { ... })
socket.on('Card:update', (payload) => { ... })
socket.on('Hero:create', (payload) => { ... })
```

---

## Exemple concret — mettre à jour une liste de joueurs en temps réel

```js
let players = []

socket.on('User:create', (payload) => {
    players.push(payload.data)
    renderPlayerList(players)
})

socket.on('User:login', (payload) => {
    console.log(`${payload.username} vient de se connecter`)
})
```

---

## Règles

| Type d'événement | Émis par |
|---|---|
| `Model:create` | Middleware Prisma (automatique) |
| `Model:update` | Middleware Prisma (automatique) |
| `Model:delete` | Middleware Prisma (automatique) |
| `User:login` | Emit manuel dans la route `/login` |
| Autres événements métier | Emit manuel dans la route concernée |