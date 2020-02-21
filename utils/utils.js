const bcrypt = require("bcryptjs");
const isEmail = require("isemail");

async function fetchUser(email, driver) {
  const session = driver.session();
  const resultPromise = session.writeTransaction(tx =>
    tx.run(
      `
      MATCH (u:User {email:toLower($email)})
      Optional MATCH (u)--(r:Role)
      SET u.last_seen=datetime().epochSeconds 
      RETURN {user:{
        nickname:u.username, 
        user_id:toString(ID(u)), 
        email:u.email, 
        picture: u.avatar_url,
        name: u.name_first + ' ' + u.name_last,
        hash: u.password_hash,
        given_name: u.name_salutation,
        family_name: u.name_last,
        email_verified: u.confirmed,
        roles:collect(toUpper(r.name))
      }}
      `,
      { email }
    )
  );
  return resultPromise.then(result => {
    session.close();
    const singleRecord = result.records[0];
    const user = singleRecord ? singleRecord.get(0).user : null;
    return user;
  });
}

async function checkPassword(pwd, hashedPwd) {
  const match = await bcrypt.compare(pwd, hashedPwd);
  return match;
}

async function verifyUser(email, driver) {
  const session = driver.session();
  const resultPromise = session.writeTransaction(tx =>
    tx.run(
      `
      MATCH (u:User {email:toLower($email)})
      SET u.confirmed = true 
      RETURN {user:{
        nickname:u.username, 
        user_id:toString(ID(u)), 
        email:u.email, 
        picture: u.avatar_url,
        name: u.name_first + ' ' + u.name_last,
        hash: u.password_hash,
        given_name: u.name_salutation,
        family_name: u.name_last,
        email_verified: u.confirmed
      }}
      `,
      { email }
    )
  );
  return resultPromise.then(result => {
    session.close();
    const singleRecord = result.records[0];
    const user = singleRecord ? singleRecord.get(0).user : null;
    return user;
  });
}

async function changePassword(email, newPassword, driver) {
  const session = driver.session();
  const resultPromise = session.writeTransaction(tx =>
    tx.run(
      `
      MATCH (u:User {email:toLower($email)})
      SET u.password_hash = $newPassword 
      RETURN {user:{
        nickname:u.username, 
        user_id:toString(ID(u)), 
        email:u.email, 
        picture: u.avatar_url,
        name: u.name_first + ' ' + u.name_last,
        hash: u.password_hash,
        given_name: u.name_salutation,
        family_name: u.name_last,
        email_verified: u.confirmed
      }}
      `,
      { email, newPassword }
    )
  );
  return resultPromise.then(result => {
    session.close();
    const singleRecord = result.records[0];
    const user = singleRecord ? singleRecord.get(0).user : null;
    return user;
  });
}

async function checkBasicAuth(token) {
  const credentials = Buffer.from(token, "base64").toString("ascii");
  const authorized =
    credentials ==
    `${process.env.AUTH0_BASIC_USERNAME}:${process.env.AUTH0_BASIC_PWD}`;
  return authorized ? { username: "AUTH0", roles: ["AUTH0"] } : null;
}

module.exports = {
  fetchUser,
  checkPassword,
  checkBasicAuth,
  verifyUser,
  changePassword
};
