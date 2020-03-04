const jwt = require("jsonwebtoken");
const { neo4jgraphql } = require("neo4j-graphql-js");
const { toNumber } = require("neo4j-driver/lib/integer");
const {
  fetchUser,
  checkPassword,
  verifyUser,
  changePassword
} = require("../utils/utils");
const fetch = require("node-fetch");
// var { DateTime } = require("luxon");
const {
  renderFormattedDateRange,
  getTimeZoneFromLocation
} = require("../utils/dateUtils");

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (obj, args, ctx, info) => "Hello world!",
    me: (obj, args, { user }, info) => JSON.stringify(user),
    ctx: (obj, arts, ctx, info) => `USER: ${JSON.stringify(ctx.user)}`
  },
  Venue: {
    // getTz: async ({ location }) => {
    //   const { latitude, longitude } = location;
    //   return await getTimeZoneFromLocation(latitude, longitude);
    // }
  },
  Event: {
    organizerNames: ({ organizerNames }, { conjunction, oxfordComma }) => {
      function oxfordJoin(
        arr = [],
        conjunction = "and",
        oxford = true,
        ifempty = ""
      ) {
        let l = arr.length;
        if (!l) return ifempty;
        if (l < 2) return arr[0];
        if (l < 3) return arr.join(` ${conjunction} `);
        arr = arr.slice();
        const lastSpacer = `${oxford ? ", " : " "}${conjunction} `;
        return arr.slice(0, -1).join(", ") + lastSpacer + arr.slice(-1);
      }
      return oxfordJoin(organizerNames, conjunction, oxfordComma);
    },
    display_daterange: (
      { _id },
      { withYear, longMonth, showTime },
      { driver },
      resolveInfo
    ) => {
      const session = driver.session();
      const resultPromise = session.writeTransaction(tx =>
        tx.run(
          `
      MATCH (this:Event) 
      WHERE ID(this) = $id 
      WITH this.startDateTime as start, this.endDateTime as end
      RETURN {start: apoc.convert.toString(start), end: apoc.convert.toString(end)} as res `,
          { id: _id }
        )
      );
      return resultPromise.then(result => {
        session.close();
        const singleRecord = result.records[0];
        const dates = singleRecord ? singleRecord.get(0) : null;
        const regex = /\[(.*)\]/gm;
        const timeZone = regex.exec(dates.start)[1];
        const formattedDateRange = renderFormattedDateRange(
          dates.start,
          dates.end,
          timeZone,
          withYear,
          longMonth,
          showTime
        );
        return formattedDateRange;
      });
    },
    displayInstanceDaterange: (
      { _id },
      { withYear, longMonth, showTime },
      { driver },
      resolveInfo
    ) => {
      const session = driver.session();
      const resultPromise = session.writeTransaction(tx =>
        tx.run(
          `
          MATCH (this)--(i:Instance)
          WHERE ID(this) = toInt($id)
          WITH this, apoc.coll.sort(apoc.coll.union(collect(apoc.convert.toString(i.startDateTime)), collect(apoc.convert.toString(i.endDateTime)))) as dates
          RETURN {start: dates[0], end: dates[-1]} as res`,
          { id: _id }
        )
      );
      return resultPromise.then(result => {
        session.close();
        const singleRecord = result.records[0];
        if (!singleRecord) return null;
        const dates = singleRecord ? singleRecord.get("res") : null;
        const regex = /\[(.*)\]/gm;
        const timeZone = regex.exec(dates.start)[1];
        const formattedDateRange = renderFormattedDateRange(
          dates.start,
          dates.end,
          timeZone,
          withYear,
          longMonth,
          showTime
        );
        return formattedDateRange;
      });
    }
  },
  Mutation: {
    login: async (object, args, { driver }) => {
      const { email, password } = args;
      // const userNode = await fetchUser(email, driver);
      // if (!userNode) throw new Error("User does not exist");
      // const validPassword = await checkPassword(password, userNode.hash);
      // if (!validPassword) throw new Error("Invalid password");

      var options = {
        method: "POST",

        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.AUTH0_CLIENT_ID,
          client_secret: process.env.AUTH0_CLIENT_SECRET,
          audience: process.env.AUTH0_API_IDENTIFIER,
          grant_type: "password",
          scope: "openid email",
          username: email,
          password: password
        })
      };
      // console.log(options);
      return fetch("https://opusaffair.auth0.com/oauth/token", options)
        .then(res => res.json())
        .then(json => {
          console.log(json);
          if (json.error) return new Error(json.error_description);
          return json.id_token;
        })
        .catch(err => console.log(err, err.extensions.stacktrace));
    },
    auth0Login: async (object, args, { driver }) => {
      const { email, password } = args;
      const userNode = await fetchUser(email, driver);
      if (!userNode) throw new Error("User does not exist");
      const validPassword = await checkPassword(password, userNode.hash);
      if (!validPassword) throw new Error("Invalid password");
      delete userNode.hash;
      return JSON.stringify({
        user: {
          ...userNode
        }
      });
    },
    auth0Verify: async (object, args, { driver }) => {
      const { email } = args;
      const userNode = await verifyUser(email, driver);
      console.log(userNode);
      if (!userNode) throw new Error("User does not exist");
      delete userNode.hash;
      return JSON.stringify({
        user: {
          ...userNode
        }
      });
    },
    auth0ChangePassword: async (object, args, { driver }) => {
      const { email, newPasswordHash } = args;
      const userNode = await changePassword(email, newPasswordHash, driver);
      if (!userNode) throw new Error("User does not exist");
      return JSON.stringify({
        user: {
          ...userNode
        }
      });
    }
  }
};

module.exports = resolvers;
