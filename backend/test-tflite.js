const tfliteService = require('./services/tfliteService');
const { predictEmotion } = require('./services/emotionDetector');

async function runTests() {
  console.log("=== TFLite Integration Test ===\n");
  
  // Wait for async initialization explicitly
  await tfliteService.initialize();
  
  const testMessages = [
    "I'm feeling really sad and lonely today.",
    "I just got an A on my exam, I'm so happy!",
    "I'm having a panic attack, I don't know what to do.",
    "I hate everything, I am so angry right now.",
    "I want to end my life.",
    "This is a completely neutral statement."
  ];

  for (const msg of testMessages) {
    console.log(`Input: "${msg}"`);
    const result = await predictEmotion(msg);
    console.log(`Detected: ${result.emotion} (Confidence: ${(result.confidence * 100).toFixed(1)}%) [Method: ${result.method}]\n`);
  }

  console.log("Tests completed.");
  process.exit(0);
}

runTests();
