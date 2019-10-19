FROM    node:12.12

# Bundle app source
COPY /app /src

# Install app dependencies
RUN cd /src; npm install

EXPOSE 4025 8086

ENTRYPOINT ["node", "/src/app.js"]
