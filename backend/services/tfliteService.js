const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class TFLiteService {
  constructor() {
    this.wordIndex = null;
    this.MAX_LENGTH = 128;
    this.OOV_TOKEN = 1;
    this.pythonProcess = null;
    this.ready = false;
    this.pendingRequests = []; // queue for requests while starting/processing
    
    this.EMOTION_MAP = [
      "sadness",
      "anxiety", 
      "stress",
      "anger",
      "joy",
      "neutral"
    ];
  }

  async initialize() {
    if (this.ready) return;

    try {
      console.log("Initializing TFLite Tokenizer and Engine...");
      
      // Load Tokenizer
      const tokenizerPath = path.join(__dirname, '../../models/tokenizer.json');
      if (!fs.existsSync(tokenizerPath)) {
        throw new Error(`Tokenizer not found at ${tokenizerPath}`);
      }
      const rawData = fs.readFileSync(tokenizerPath, 'utf8');
      const tokenizerJson = JSON.parse(rawData);
      
      let parsedWordIndex = {};
      if (tokenizerJson.config && tokenizerJson.config.word_index) {
        parsedWordIndex = JSON.parse(tokenizerJson.config.word_index);
      } else if (tokenizerJson.word_index) {
        parsedWordIndex = JSON.parse(tokenizerJson.word_index);
      }
      this.wordIndex = parsedWordIndex;

      // Start Python TFLite Bridge
      const modelPath = path.join(__dirname, '../../models/mindmate_model.tflite');
      const runnerPath = path.join(__dirname, '../tflite_runner.py');
      
      this.pythonProcess = spawn('python3', [runnerPath, modelPath]);
      
      return new Promise((resolve, reject) => {
        const initTimeout = setTimeout(() => {
          if (!this.ready) {
            console.error("TFLite Bridge initialization timed out.");
            if (this.pythonProcess) this.pythonProcess.kill();
            reject(new Error("TFLite initialization timeout"));
          }
        }, 10000);

        this.pythonProcess.stdout.on('data', (data) => {
          const output = data.toString().trim().split('\n');
          
          for (const line of output) {
            if (line === 'READY') {
              this.ready = true;
              console.log("TFLite Bridge is ready.");
              clearTimeout(initTimeout);
              resolve();
            } else if (line.startsWith('{')) {
              try {
                const result = JSON.parse(line);
                
                // If we get an error during initialization
                if (result.error && !this.ready) {
                  clearTimeout(initTimeout);
                  reject(new Error(result.error));
                  return;
                }

                if (this.pendingRequests.length > 0) {
                  const req = this.pendingRequests.shift();
                  req.resolve(result);
                }
              } catch (err) {}
            }
          }
        });

        this.pythonProcess.stderr.on('data', (data) => {
          const msg = data.toString();
          // Filter out info logs to keep console clean
          if (!msg.includes('I tensorflow/core') && !msg.includes('NotOpenSSLWarning')) {
            console.error(`TFLite Bridge Error: ${msg}`);
          }
        });
        
        this.pythonProcess.on('error', (err) => {
          console.error(`Failed to start TFLite subprocess: ${err}`);
          clearTimeout(initTimeout);
          reject(err);
        });

        this.pythonProcess.on('close', (code) => {
          if (!this.ready) {
            clearTimeout(initTimeout);
            reject(new Error(`Python process exited with code ${code}`));
          }
          this.ready = false;
          this.pythonProcess = null;
        });
      });
      
    } catch (error) {
      console.error("Error initializing TFLite service:", error.message);
    }
  }

  tokenize(text) {
    if (!this.wordIndex) throw new Error("Tokenizer not initialized");

    const words = text
      .toLowerCase()
      .replace(/[!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~\t\n]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

    let sequence = words.map(word => this.wordIndex[word] || this.OOV_TOKEN);

    if (sequence.length > this.MAX_LENGTH) {
      sequence = sequence.slice(0, this.MAX_LENGTH);
    }
    while (sequence.length < this.MAX_LENGTH) {
      sequence.push(0);
    }
    return sequence;
  }

  _processQueue() {
    // Process any requests that were queued while initializing
  }

  async predict(text) {
    if (!this.ready || !this.pythonProcess) {
      console.warn("TFLite model is not loaded. Falling back to default.");
      return { emotion: "neutral", confidence: 0.1 };
    }

    try {
      const sequence = this.tokenize(text);
      
      return new Promise((resolve) => {
        this.pendingRequests.push({ resolve });
        this.pythonProcess.stdin.write(JSON.stringify({ sequence }) + '\n');
      }).then(result => {
        if (result.error) throw new Error(result.error);
        
        const logits = result.logits;
        let maxIndex = 0;
        let maxValue = logits[0];
        for (let i = 1; i < logits.length; i++) {
          if (logits[i] > maxValue) {
            maxValue = logits[i];
            maxIndex = i;
          }
        }

        // Softmax
        const exps = logits.map(Math.exp);
        const sumExps = exps.reduce((a, b) => a + b, 0);
        const confidence = exps[maxIndex] / sumExps;

        return {
          emotion: this.EMOTION_MAP[maxIndex] || "neutral",
          confidence
        };
      });
    } catch (error) {
      console.error("TFLite prediction error:", error.message);
      return { emotion: "neutral", confidence: 0.1 };
    }
  }
}

const tfliteService = new TFLiteService();
tfliteService.initialize().catch(err => {
  console.error("TFLite Service failed to initialize:", err.message);
  console.info("Chat will continue using local fallback responses.");
});

module.exports = tfliteService;
