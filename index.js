const express = require("express");
const cors = require("cors");
const r = require("rethinkdb");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function connectToDatabase() {
  return new Promise((resolve, reject) => {
    r.connect({ host: "localhost", port: 28015 }, (err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const conn = await connectToDatabase();
    const cursor = await r
      .db("guesWho")
      .table("users")
      .filter({ username: username })
      .run(conn);
    const result = await cursor.toArray();

    if (result.length === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      const user = result[0];
      if (user.password === password) {
        const userData = {
          username: user.username,
          highScores: user.highScores,
        };
        res.json({ user: userData });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    }
    conn.close();
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const conn = await connectToDatabase();
    const cursor = await r
      .db("guesWho")
      .table("users")
      .filter({ username: username })
      .run(conn);
    const result = await cursor.toArray();

    if (result.length > 0) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      await r
        .db("guesWho")
        .table("users")
        .insert({
          username: username,
          password: password,
          highScores: [],
        })
        .run(conn);
      res.status(201).json({ message: "User registered successfully" });
    }
    conn.close();
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/highscores", async (req, res) => {
  try {
    const conn = await connectToDatabase();
    const cursor = await r.db("guesWho").table("users").run(conn);
    const users = await cursor.toArray();

    let allScores = [];

    users.forEach((user) => {
      user.highScores.forEach((score) => {
        allScores.push({ username: user.username, score: score });
      });
    });

    allScores.sort((a, b) => b.score - a.score);
    const topScores = allScores.slice(0, 10);

    res.json(topScores);
    conn.close();
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/highscores/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const conn = await connectToDatabase();
    const cursor = await r
      .db("guesWho")
      .table("users")
      .filter({ username })
      .run(conn);
    const result = await cursor.toArray();

    if (result.length === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      const user = result[0];
      res.json({ username: user.username, highScores: user.highScores });
    }

    conn.close();
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/question", async (req, res) => {
  try {
    const conn = await connectToDatabase();
    const cursor = await r.db("guesWho").table("question").run(conn);
    const result = await cursor.toArray();

    if (result.length === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      const question = result;
      res.json(question);
    }

    conn.close();
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.post("/updateScore/:username", async (req, res) => {
  try {
    const { score } = req.body;
    const username = req.params.username;

    if (!score || !Array.isArray(score)) {
      return res.status(400).json({ error: "Invalid or missing score" });
    }

    const conn = await connectToDatabase();

    const result = await r
      .db("guesWho")
      .table("users")
      .filter({ username: username })
      .update({ highScores: score })
      .run(conn);

    conn.close();

    if (result.replaced === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Score updated successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
