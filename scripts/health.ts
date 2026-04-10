import "dotenv/config";

const depositProcessorUrl = process.env.DEPOSIT_PROCESSOR_URL;

const response = await fetch(`${depositProcessorUrl}/health`);
const text = await response.text();
console.log(`Status: ${response.status}`);
console.log(text);
