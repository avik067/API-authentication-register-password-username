const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// POST 1

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPass = await bcrypt.hash(password, 10);
  const initialQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(initialQuery);

  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQ = `INSERT INTO user(username, name, password, gender, location) 
                  VALUES (
                     '${username}', '${name}' , '${hashedPass}' ,'${gender}' , '${location}'
                  ) 
      `;

      const dbResp = await db.run(createUserQ);

      const newUserId = dbResp.lastID;
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// POST 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const initialQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(initialQuery);

  if (dbUser !== undefined) {
    const isMatched = await bcrypt.compare(password, dbUser.password);
    if (isMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

// POST 3

app.post("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkInitialQuery = `
  SELECT * FROM user WHERE username = '${username}' 
  `;
  const dbUser = await db.get(checkInitialQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isMatched = await bcrypt.compare(oldPassword, dbUser.password);
    if (isMatched === true) {
      const lengthNew = newPassword.length;
      if (lengthNew < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encrypted = await bcrypt.hash(newPassword, 10);
        const updateQuer = `
              UPDATE user 
              SET password = '${encrypted}'
              WHERE username = '${username}' 
              `;
        await db.run(updateQuer);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = initializeDBAndServer;
module.exports = app;
