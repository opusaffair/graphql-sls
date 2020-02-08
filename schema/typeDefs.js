// Set defaults for Boston
const lat = 42.3601,
  lng = -71.058,
  radius = 5000;

// Construct a schema, using GraphQL schema language
const typeDefs = `

    enum Role {
      ADMIN
      MODERATOR
      USER
      OWNER
    }

  type Query {
    hello: String
    me: String @cypher(statement: "RETURN $cypherParams.currentUserId")
  }

  type Mutation {
    convertDates: String @cypher(statement: """
      Match (e:Event)
      SET e.new_start_datetime = datetime({epochSeconds:toInteger(e.start_datetime), timezone: 'America/New York'})
      SET e.new_end_datetime = datetime({epochSeconds:toInteger(e.end_datetime), timezone: 'America/New York'})
      RETURN 'Finished'
    """)
    convertLocations: String @cypher(statement: """
      Match (v:Venue)
      SET v.location = point({latitude:v.latitude, longitude:v.longitude})  
      RETURN 'Finished'
    """)
    login(email: String!): String
  }

  type User {
    username: String!
    _id: ID!
    involved_in: [Event] @relation(name: "INVOLVED_IN", direction: "OUT")
    email: String
    followedByMe: Boolean @cypher(statement: """
      MATCH (me:User {username: $cypherParams.currentUserId})
      RETURN EXISTS ((me)-[:FOLLOWS]->(this))
    """) 
  } 

  type Venue {
    name: String
    location: Point
  }

  type Org {
    name: String
  }

  type Tag {
    name: String
  }

  type Event {
    title: String
    slug: String
    image_url: String
    start_datetime: Float
    new_start_datetime: DateTime
    new_end_datetime: DateTime
    other_start_datetime: DateTime @cypher(statement: "Return datetime(this.new_start_datetime)")
    end_datetime: Float
    venue: [Venue] @relation(name: "HELD_AT", direction: "OUT")
    owners: [User] @relation(name: "OWNS", direction: "IN")
    involved: [User] @relation(name: "INVOLVED_IN", direction: "IN")
    popularity: Float
      @cypher(statement: """
      MATCH (this)
      Optional Match pe=((this)--(u:User))
      Optional Match (this)<-[inv:INVOLVED_IN]-(u) 
      Optional Match (this)<-[int:INTERESTED_IN]-(u) 
      Optional Match (this)<-[att:ATTENDING]-(u)
      RETURN 1000*count(distinct inv)
      +300*count(distinct att)
      +100*count(distinct int) 
      +this.view_count 
      +10*sum(distinct reduce(weight = 0, r1 in relationships(pe) | weight + u.follower_count)) 
      """)
      recommended: Float
      @cypher(statement: """
      MATCH (me:User {username: $cypherParams.currentUserId})
      Optional MATCH folInv=((this)<-[:INVOLVED_IN]-(:User)<-[r3:FOLLOWS]-(me))
      Optional MATCH tagsVenuesAndOrgs=((this)-[:HELD_AT|ORGANIZES|TAGGED]-(x)-[:HELD_AT|ORGANIZES|TAGGED]-(:Event)<--(me))
      RETURN 10*count(folInv) + count(tagsVenuesAndOrgs)
      """)
  }
`;

module.exports = { typeDefs };
