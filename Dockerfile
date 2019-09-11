FROM node:10

WORKDIR /node-app

RUN mkdir /credentials
RUN ln -s /credentials /node-app/credentials

COPY index.js ./
COPY package*.json ./

RUN npm install

ENTRYPOINT ["node", "index.js"]
