# Build the web app, then serve the static files with nginx.
FROM node:24-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
# MediaPipe runtime is served from our own origin (no third-party CDN).
RUN mkdir -p public/mediapipe && cp node_modules/@mediapipe/tasks-vision/wasm/* public/mediapipe/
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
