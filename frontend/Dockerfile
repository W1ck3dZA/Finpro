FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Dev server (matches local `npm run dev`), not a production build — hot reload still works
# because the source is baked into the image at build time; rebuild the image after code changes.
CMD ["npm", "run", "dev", "--", "--port", "5173"]
