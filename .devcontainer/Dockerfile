FROM node:20
USER root

ENV ROOT /TarkovTracker
RUN mkdir -p $ROOT

# Ensure vite starts bound to any interface not implicit localhost
ENV BINDING 0.0.0.0
# Install Node.js, Java JRE, Firebase CLI
RUN apt-get update \
 && apt-get install -y nodejs default-jre unzip \
 && npm install -g firebase-tools \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR $ROOT
CMD ["/usr/bin/zsh", "-c", "npm run container & ; while :; do sleep 1; done"]
