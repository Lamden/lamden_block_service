FROM node:gallium-bullseye-slim

RUN apt-get update

ENV ROOT /usr/src/app

WORKDIR ${ROOT}

COPY .  ${ROOT}

RUN npm install

CMD [ "npm", "run", "start" ]