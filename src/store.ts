import { createOpenAI } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";
import { PgVector } from "@mastra/pg";
import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";
import { parse as csvParse } from "csv-parse/sync";

// Define PostgreSQL connection string
const DOCS_DIR = "./src/documents";
const INDEX_NAME = "helpdesk_troubleshooting_documents";

// Function to extract text from docx
async function extractTextFromDocx(docxPath: string): Promise<string> {
  const { value } = await mammoth.extractRawText({ path: docxPath });
  return value;
}

// Function to extract text from CSV with better structure
function extractTextFromCsv(csvPath: string): string[] {
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records = csvParse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const documents: string[] = [];
  
  for (const record of records as Record<string, string>[]) {
    const title = record['Title (Example in CM21)'] || '';
    const description = record['Ticket Description'] || '';
    const troubleshooting = record['Troubleshooting Description'] || '';
    const category = record['Category'] || '';
    const subCategory = record['Sub Category'] || '';
    
    // Create a well-structured document with all relevant information
    const document = `
TITLE: ${title}
CATEGORY: ${category}
SUB_CATEGORY: ${subCategory}
DESCRIPTION: ${description}
TROUBLESHOOTING_STEPS:
${troubleshooting}
    `.trim();
    
    documents.push(document);
  }

  return documents;
}

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  // Read the PDF file
  const dataBuffer = fs.readFileSync(pdfPath);

  const pdf = require("pdf-parse");

  // Parse the PDF content
  const data = await pdf(dataBuffer);

  // Return the text content
  return data.text;
}

// Function to clear specific index if it exists
async function clearIndex(
  pgVector: PgVector,
  indexName: string
): Promise<void> {
  console.log(`Checking if index '${indexName}' exists...`);

  try {
    const indexes = await pgVector.listIndexes();

    if (indexes.includes(indexName)) {
      console.log(`Deleting existing index: ${indexName}`);
      await pgVector.deleteIndex({ indexName: indexName });
      console.log(`Index '${indexName}' deleted successfully`);
    } else {
      console.log(`Index '${indexName}' does not exist, no need to delete`);
    }
  } catch {
    // If the table doesn't exist, that's expected for a fresh setup
    console.log(`Index table doesn't exist yet, this is normal for first-time setup`);
    console.log(`Continuing to create new index...`);
  }
}

async function main() {
  const pgVector = new PgVector({ connectionString: process.env.VECTOR_DB_URL! });

  try {
    // Try to create the index directly first
    console.log(`Creating index '${INDEX_NAME}'...`);
    await pgVector.createIndex({
      indexName: INDEX_NAME,
      dimension: 768, // nomic-embed-text produces 768-dimensional vectors
    });
    console.log(`Index '${INDEX_NAME}' created successfully`);
  } catch {
    console.log(`Error creating index, attempting to clear existing index and recreate...`);
    
    // If creation fails, try to clear and recreate
    try {
      await clearIndex(pgVector, INDEX_NAME);
    } catch (clearError) {
      console.log(`Could not clear index:`, clearError);
    }
    
    // Try to create the index again
    await pgVector.createIndex({
      indexName: INDEX_NAME,
      dimension: 768, // nomic-embed-text produces 768-dimensional vectors
    });
    console.log(`Index '${INDEX_NAME}' created successfully on second attempt`);
  }

  // List all document files in the docs directory
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".docx") || f.endsWith(".csv"));

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    console.log(`Processing: ${filePath}`);

    // Extract text based on file type
    let documents: string[] = [];
    if (file.endsWith(".docx")) {
      const text = await extractTextFromDocx(filePath);
      documents = [text];
    } else if (file.endsWith(".csv")) {
      documents = extractTextFromCsv(filePath);
    } else if (file.endsWith(".pdf")) {
      const text = await extractTextFromPDF(filePath);
      documents = [text];
    } else {
      console.log(`Skipping unsupported file type: ${file}`);
      continue;
    }

    console.log(`Number of documents for ${file}:`, documents.length);

    const openai = createOpenAI({
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
      compatibility: "compatible",
    });

    // Process each document with better chunking strategy
    for (let i = 0; i < documents.length; i++) {
      const doc = MDocument.fromText(documents[i]);
      
      // Use larger chunks to preserve semantic meaning and keep troubleshooting steps together
      const chunks = await doc.chunk({
        strategy: "recursive",
        size: 3000, // Larger chunks to keep complete troubleshooting steps
        overlap: 800, // Good overlap for context continuity
        separator: "\n\n",
      });

      console.log(`Number of chunks for document ${i + 1}:`, chunks.length);

      // Generate embeddings using embed function for each chunk
      const embeddings: number[][] = [];
      for (const chunk of chunks) {
        const { embedding } = await embed({
          model: openai.embedding("nomic-embed-text:latest"),
          value: chunk.text,
        });
        embeddings.push(embedding);
      }

      // Store embeddings with enriched metadata
      await pgVector.upsert({
        indexName: INDEX_NAME,
        vectors: embeddings,
        metadata: chunks.map((chunk: { text: string }) => ({
          text: chunk.text,
          source: file,
          documentIndex: i,
          chunkType: file.endsWith(".csv") ? "troubleshooting_entry" : "document",
          hasTroubleshootingSteps: chunk.text.toLowerCase().includes("step") || chunk.text.toLowerCase().includes("troubleshooting"),
        })),
      });
    }

    console.log(`Stored embeddings for ${file}`);
  }
}

main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});
