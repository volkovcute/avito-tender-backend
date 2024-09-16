# Stage 1: Установка зависимостей и компиляция проекта
FROM node:20.12.2-alpine3.18 AS build-stage
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN node ace build

# Stage 2: Использование скомпилированного кода и выполнение миграций
FROM node:20.12.2-alpine3.18 AS production-stage
WORKDIR /app

ENV APP_KEY=XzE1mpJQ898USWSvZ77ZAOl9YSpJVhna
ENV LOG_LEVEL=info
ENV POSTGRES_HOST=rc1b-5xmqy6bq501kls4m.mdb.yandexcloud.net
ENV POSTGRES_PORT=6432
ENV POSTGRES_USERNAME=cnrprod1725831582-team-77502
ENV POSTGRES_PASSWORD=cnrprod1725831582-team-77502
ENV POSTGRES_DATABASE=cnrprod1725831582-team-77502
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY --from=build-stage /app/build /app
COPY --from=build-stage /app/node_modules /app/node_modules

RUN printenv
RUN node ace migration:run --force

EXPOSE 8080

CMD ["node", "./bin/server.js"]
