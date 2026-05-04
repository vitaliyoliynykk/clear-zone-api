# Clear Zone API

Backend API for the **Clear Zone** project, an embedded indoor air quality monitoring system based on **ESP32** microcontroller.

This service handles authentication, device and measurement management, IAQ processing, MQTT/WebSocket communication, AI-generated air quality insights, and push notification workers.

## Stack

- Node.js
- TypeScript
- Express
- MongoDB / Mongoose
- MQTT
- WebSocket
- OpenAI API

## Main Features

- User authentication
- ESP32 module registration and management
- Indoor air quality measurements and scoring
- Real-time messaging over MQTT/WebSocket
- AI analysis of air quality trends
- Web push notifications for IAQ changes

## Development

Install dependencies:

```bash
pnpm install
```

Run the API:

```bash
pnpm dev-api
```

Run workers:

```bash
pnpm dev-iaq-worker
pnpm dev-notifications-worker
pnpm dev-voc-state-worker
pnpm dev-voc-signal-worker
```

Build for production:

```bash
pnpm build
```
