FROM denoland/deno:1.23.4
WORKDIR /app

ENV FULL_URL_TO_TEST=http://localhost:5000

COPY deps.ts .
# https://medium.com/deno-the-complete-reference/running-deno-in-docker-35756ffff66d
RUN deno cache deps.ts

COPY main.ts .
RUN deno cache main.ts

ENTRYPOINT ["deno"]
CMD ["run", "--allow-env", "--allow-net", "main.ts"]
