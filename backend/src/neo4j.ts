import neo4j, { Driver } from "neo4j-driver";
import { config } from "./config.js";
import { DateSession, GraphFact } from "./types.js";

let driver: Driver | null = null;

export function getDriver() {
  if (!config.neo4jUri || !config.neo4jPassword) return null;
  if (!driver) {
    driver = neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword));
  }
  return driver;
}

export async function writeFacts(session: DateSession, facts: GraphFact[]) {
  const neo = getDriver();
  if (!neo || !facts.length) return;
  const db = neo.session();
  try {
    for (const fact of facts) {
      await db.run(
        `
        MERGE (u:User {id: $userId})
        MERGE (d:DateSession {id: $sessionId})
        MERGE (u)-[:HAD_DATE]->(d)
        MERGE (p:Person {sessionId: $sessionId, label: $subject})
        MERGE (o:Memory {value: $object})
        MERGE (p)-[r:REMEMBERS {relation: $relation}]->(o)
        SET r.confidence = $confidence,
            r.updatedAt = datetime(),
            d.title = $title
        `,
        {
          userId: session.userId,
          sessionId: session.id,
          title: session.title,
          subject: fact.subject,
          relation: fact.relation,
          object: fact.object,
          confidence: fact.confidence
        }
      );
    }
  } finally {
    await db.close();
  }
}
