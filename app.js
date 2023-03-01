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

const convertStatesDBObjectToResponseObject = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictDBObjectToResponseObject = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

const convertStatesStatsDBObjectToResponseStatsObject = (obj) => {
  return {
    totalCases: obj.cases,
    totalCured: obj.cured,
    totalActive: obj.active,
    totalDeaths: obj.deaths,
  };
};

//Login User API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const userDBResponse = await db.get(getUserQuery);
  if (userDBResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDBResponse.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "balu_abcdefg");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateUser = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHeader.split(" ")[1];
    jwt.verify(jwtToken, "balu_abcdefg", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//Get States API 2
app.get("/states/", authenticateUser, async (request, response) => {
  const getStatesQuery = `
    SELECT *
    FROM
    state
    ORDER BY state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachItem) =>
      convertStatesDBObjectToResponseObject(eachItem)
    )
  );
});

//Get State API 3
app.get("/states/:stateId/", authenticateUser, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
    *
    FROM
    state
    WHERE
    state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStatesDBObjectToResponseObject(state));
});

//Post District API 4
app.post("/districts/", authenticateUser, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictDetailsQuery = `
    INSERT INTO
    district(
        district_name,
        state_id,
        cases,
        cured,
        active,
        deaths
    )VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  await db.run(postDistrictDetailsQuery);
  response.send("District Successfully Added");
});

//Get district API 5
app.get(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
    SELECT *
    FROM
    district
    WHERE
    district_id = ${districtId};`;
    const district = await db.get(getDistrictQuery);
    response.send(convertDistrictDBObjectToResponseObject(district));
  }
);

//Delete District API 6
app.delete(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE
    FROM
    district
    WHERE
    district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//Update District API 7
app.put(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updateDistrictQuery = `
    UPDATE
    district
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE
    district_id = ${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//Get Stats Of State API 8
app.get(
  "/states/:stateId/stats",
  authenticateUser,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStatsQuery = `
    SELECT
    SUM(cases) as cases,
    SUM(cured) as cured,
    SUM(active) as active,
    SUM(deaths) as deaths
    FROM
    district
    WHERE
    state_id = ${stateId}
    GROUP BY
    state_id;`;
    const stateStats = await db.get(getStateStatsQuery);
    response.send(convertStatesStatsDBObjectToResponseStatsObject(stateStats));
  }
);

module.exports = app;
