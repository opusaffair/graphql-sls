const bcrypt = require("bcryptjs");
const isEmail = require("isemail");

async function fetchUser(email, driver) {
  const session = driver.session();
  const resultPromise = session.writeTransaction(tx =>
    tx.run(
      `
      MATCH (u:User {email:toLower($email)})--(r:Role) 
      SET u.last_seen=datetime().epochSeconds 
      RETURN {user:{username:u.username, _id:ID(u), email:u.email, hash: u.password_hash, roles:collect(toUpper(r.name))}}
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

module.exports = { fetchUser, checkPassword };
