// Set defaults for Boston
const lat = 42.3601,
  lng = -71.058,
  radius = 5000;

// Construct a schema, using GraphQL schema language
const typeDefs = `

    enum Role {
      ADMIN
      MODERATOR
      HOST
      USER
    }

  type Query {
    hello: String
    cypherMe: String @cypher(statement: "RETURN $cypherParams.currentUserId")
    me: String
    ctx: String
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
    login(email: String!, password: String!): String
  }

  type User {
    username: String!
    _id: ID!
    involved_in: [Involved]
    involvement: [Involvement]  @relation(name: "INVOLVEMENT", direction: "OUT")
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

  type Involved @relation(name: "INVOLVED_IN") {
    from: User
    to: Event
    how: String
  }

  type Involvement {
    user: User @relation(name: "INVOLVEMENT", direction: "IN")
    event: Event @relation(name: "INVOLVEMENT", direction: "OUT")
    how: String
  }

  type Event {
    title: String
    slug: String
    image_url: String
    start_datetime: Float
    new_start_datetime: DateTime
    new_end_datetime: DateTime
    display_daterange(showTime: Boolean = true, withYear: Boolean = true, longMonth: Boolean = true): String
    end_datetime: Float
    venue: [Venue] @relation(name: "HELD_AT", direction: "OUT")
    organizers: [Org] @relation(name: "ORGANIZES", direction: "IN")
    tags: [Tag] @relation(name: "TAGGED", direction: "IN" )
    owners: [User] @relation(name: "OWNS", direction: "IN")
    involved: [Involved]
    involvement: [Involvement]  @relation(name: "INVOLVEMENT", direction: "IN")
    interested: [User] @relation(name: "INTERESTED_IN", direction: "IN")
    attending: [User] @relation(name: "ATTENDING", direction: "IN")
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
