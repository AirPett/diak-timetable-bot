ARG arch=amd64

FROM ${arch}/node:10

WORKDIR /node-app

ENV TZ=Europe/Helsinki

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN mkdir /config && ln -s /config /node-app/config

COPY index.js ./
COPY package*.json ./

RUN npm install

ENTRYPOINT ["node", "index.js"]
