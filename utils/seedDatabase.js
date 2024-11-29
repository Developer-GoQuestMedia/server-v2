import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB);

    // Read and parse JSON files
    const projectsPath = path.join(process.cwd(), 'Data', 'project.json');
    const dialoguesPath = path.join(process.cwd(), 'Data', 'Dailouges.json');

    console.log('Reading from paths:', { projectsPath, dialoguesPath });

    const projectsRaw = await fs.readFile(projectsPath, 'utf8');
    const dialoguesRaw = await fs.readFile(dialoguesPath, 'utf8');

    const projectsData = JSON.parse(projectsRaw);
    const dialoguesData = JSON.parse(dialoguesRaw);

    if (!Array.isArray(dialoguesData)) {
      throw new Error(`Dialogues data is not an array. Type: ${typeof dialoguesData}`);
    }

    // Get the first project from the array
    const projectData = Array.isArray(projectsData) ? projectsData[0] : projectsData;
    const projectId = new ObjectId(projectData._id.$oid);

    console.log(`Found 1 project and ${dialoguesData.length} dialogues`);

    // Transform project data to handle ObjectId
    const transformedProject = {
      ...projectData,
      _id: projectId
    };

    // Transform dialogues data to handle NumberInt and ensure project ID is ObjectId
    const transformedDialogues = dialoguesData.map(dialogue => ({
      ...dialogue,
      project: projectId, // Convert project string to ObjectId
      index: parseInt(dialogue.index.$numberInt),
      lipMovements: parseInt(dialogue.lipMovements.$numberInt),
      emotions: {
        primary: {
          ...dialogue.emotions.primary,
          intensity: parseInt(dialogue.emotions.primary.intensity.$numberInt)
        },
        secondary: {
          ...dialogue.emotions.secondary,
          intensity: parseInt(dialogue.emotions.secondary.intensity.$numberInt)
        }
      }
    }));

    // Clear existing collections
    await db.collection('projects').deleteMany({});
    await db.collection('dialogues').deleteMany({});

    // Insert new data
    const projectResult = await db.collection('projects').insertOne(transformedProject);
    console.log(`1 project inserted with ID: ${projectResult.insertedId}`);

    if (transformedDialogues.length > 0) {
      const dialogueResult = await db.collection('dialogues').insertMany(transformedDialogues);
      console.log(`${dialogueResult.insertedCount} dialogues inserted`);
      
      // Verify a few dialogues
      const sampleDialogues = await db.collection('dialogues').find().limit(2).toArray();
    //   console.log('Sample dialogues:', JSON.stringify(sampleDialogues, null, 2));
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await client.close();
  }
}

export default seedDatabase;