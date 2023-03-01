const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());

const initializeBDAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3001, () =>
      console.log("Server Running at http://localhost:3001/")
    );
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeBDAndServer();

const authenticateUser = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid");
  }
};

app.post("/login/", async (request, response) => {
  console.log("function");
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const userDBResponse = await db.get(getUserQuery);
  if (userDBResponse === undefined) {
    console.log("outer if");
    response.status(400);
    response.send("Invalid user");
  } else {
    console.log("outer else");
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDBResponse.password
    );
    if (isPasswordMatched === true) {
      console.log("inner if");
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "balu_abcdefg");
      response.send({ jwtToken });
    } else {
      console.log("inner else");
      response.status(400);
      response.send("Invalid password");
    }
  }
});
