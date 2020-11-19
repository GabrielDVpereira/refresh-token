require("dotenv/config");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

const posts = [
  {
    username: "Jim",
    title: "my first post",
  },
  {
    username: "Gabriel",
    title: "How to be Gabriel Friend",
  },
  {
    username: "Davi",
    title: "Davi is off",
  },
  {
    username: "Jhon",
    title: "How to find a job",
  },
];

app.use(express.json());

app.get("/posts", authToken, (req, res) => {
  res.json(posts.filter((post) => post.username === req.user.name));
});

app.post("/login", (req, res) => {
  const { username } = req.body;
  const user = {
    name: username,
  };
  const access_token = jwt.sign(user, process.env.TOKEN_SECRET);
  res.json({ access_token });
});

function authToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.sendStatus(401);
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    console.log(err);
    if (err) return res.sendStatus(403);

    req.user = user;
    return next();
  });
}

app.listen(3000);
