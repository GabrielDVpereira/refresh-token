require("dotenv/config");
const express = require("express");
const jwt = require("jsonwebtoken");
const redis = require("redis");
const app = express();

app.use(express.json());

const refreshTokens = [];

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

app.post("/login", (req, res) => {
  const { username } = req.body;
  const user = {
    name: username,
  };
  const access_token = generateAccessToken(user);
  const refresh_token = jwt.sign(user, process.env.REFRESH_SECRET);

  saveRefreshRedis(refresh_token);

  res.json({ access_token, refresh_token });
});

app.post("/token", async (req, res) => {
  const refresh_token = req.body.token;
  if (!refresh_token) return res.sendStatus(401);

  const refresh_token_list = await getRefreshRedis();

  const isTokenValid = refresh_token_list.includes(refresh_token);
  if (!isTokenValid) {
    return res.sendStatus(403);
  }

  jwt.verify(refresh_token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const access_token = generateAccessToken({ name: user.name });
    return res.json(access_token);
  });
});

app.delete("/logout", (req, res) => {
  removeTokenRedis(req.body.token);
  res.sendStatus(204);
});

function generateAccessToken(user) {
  return (access_token = jwt.sign(user, process.env.TOKEN_SECRET, {
    expiresIn: "3600s",
  }));
}

async function removeTokenRedis(token) {
  const refresh_token_list = await getRefreshRedis();
  let new_refresh_token_list;

  if (refresh_token_list) {
    new_refresh_token_list = refresh_token_list.filter(
      (refresh_token) => refresh_token !== token
    );
    redisClient.set(
      "refresh_token",
      JSON.stringify(new_refresh_token_list),
      (err, reply) => {
        if (reply === "OK") console.log("token removes from redis");
      }
    );
  }
}

async function saveRefreshRedis(token) {
  const refresh_token_list = await getRefreshRedis();
  if (refresh_token_list) {
    redisClient.set(
      "refresh_token",
      JSON.stringify([...refresh_token_list, token]),
      (err, reply) => {
        if (reply === "OK") console.log("refresh saved to redis");
      }
    );
  } else {
    redisClient.set("refresh_token", JSON.stringify([token]), (err, reply) => {
      if (reply === "OK") console.log("refresh saved to redis");
    });
  }
}

function getRefreshRedis() {
  return new Promise((resolve, reject) => {
    redisClient.get("refresh_token", (err, reply) => {
      if (err) reject(err);
      resolve(JSON.parse(reply));
    });
  });
}

app.listen(4000);
