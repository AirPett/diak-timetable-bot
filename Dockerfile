FROM node:10

WORKDIR /node-app

RUN sudo echo "Europe/Helsinki" > /etc/timezone
RUN sudo dpkg-reconfigure -f noninteractive tzdata

RUN mkdir /credentials
RUN ln -s /credentials /node-app/credentials

COPY index.js ./
COPY package*.json ./

RUN npm install

ENTRYPOINT ["node", "index.js"]
