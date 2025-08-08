// import { Mastra } from "@mastra/core";
// import { PgVector } from "@mastra/pg";
// import { createHelpdeskAgent, getIndexNameFromProject, helpDeskSupportAgent } from "./agents/Agent";

// const pgVector = new PgVector({
//   connectionString: process.env.VECTOR_DB_URL!,
// });

// export const mastra = new Mastra({
//   agents: { helpDeskAgent: helpDeskSupportAgent },
//   vectors: { pgVector },
// });

// export { createHelpdeskAgent, getIndexNameFromProject };

import { Mastra } from "@mastra/core";

import { PgVector } from "@mastra/pg";
import {
  HelpdeskAgent,
} from "./agents/Agent";
// export const mastra = new Mastra({
//   agents: [researchAgent],
// });
const pgVector = new PgVector({
  connectionString: process.env.VECTOR_DB_URL!,
});
export const mastra = new Mastra({
  agents: {

    HelpdeskAgent,

  },
  vectors: { pgVector },
});
