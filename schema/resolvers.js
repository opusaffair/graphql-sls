const jwt = require("jsonwebtoken");
const { neo4jgraphql } = require("neo4j-graphql-js");
const { toNumber } = require("neo4j-driver/lib/integer");
const { fetchUser, checkPassword } = require("../utils/utils");
// var { DateTime } = require("luxon");
const {
  renderFormattedDateRange,
  getTimeZoneFromLocation
} = require("../utils/dateUtils");

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (obj, args, ctx, info) => "Hello world!",
    me: (obj, args, { user }, info) =>
      user.email ? `Logged in as ${user.email}` : `Not logged in`,
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
      WITH this.startDatetime as start, this.endDateTime as end
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
    }
  },
  Mutation: {
    login: async (object, { email, password }, { driver }) => {
      const userNode = await fetchUser(email, driver);
      if (!userNode) throw new Error("User does not exist");
      const { _id, username, hash, roles } = userNode;
      const validPassword = await checkPassword(password, userNode.hash);
      if (!validPassword) throw new Error("Invalid password");
      const token = jwt.sign(
        {
          user: {
            email,
            _id: toNumber(_id),
            username,
            roles
          }
        },
        process.env.JWT_SECRET
      );
      return token;
    }
  }
};

module.exports = resolvers;
