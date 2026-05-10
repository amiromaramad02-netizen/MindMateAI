const fs = require('fs');
const path = require('path');

let examples = [];

function loadCSV() {
  const candidates = [
    path.join(__dirname, '..', '/Users/onlymec/Downloads/mindmate_dataset_cleaned (1).csv'),
    path.join(__dirname, '/Users/onlymec/Downloads/mindmate_dataset_cleaned (1).csv'),
    path.join(process.cwd(), '/Users/onlymec/Downloads/mindmate_dataset_cleaned (1).csv')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      // Expect header like: text,emotion,response?
      const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
      const textIdx = header.indexOf('text') >= 0 ? header.indexOf('text') : 0;
      const emotionIdx = header.indexOf('emotion') >= 0 ? header.indexOf('emotion') : 1;

      examples = lines.map(line => {
        // naive CSV split - works for simple datasets
        const cols = line.split(',');
        return {
          text: (cols[textIdx] || '').trim().toLowerCase(),
          emotion: (cols[emotionIdx] || '').trim().toLowerCase()
        };
      });

      console.log('Dataset loaded from', p, 'examples:', examples.length);
      return;
    }
  }

  console.log('No dataset found; falling back to keyword-based emotion detection');
}

function predictEmotion(message) {
  const msg = (message || '').toLowerCase();

  // If dataset loaded, use simple overlap scoring
  if (examples && examples.length > 0) {
    const tokens = msg.split(/\W+/).filter(Boolean);
    let best = {score: 0, emotion: 'neutral'};
    for (const ex of examples) {
      const exTokens = ex.text.split(/\W+/).filter(Boolean);
      const common = exTokens.filter(t => tokens.includes(t)).length;
      if (common > best.score) {
        best.score = common;
        best.emotion = ex.emotion || 'neutral';
      }
    }
    if (best.score > 0) return best.emotion;
  }

  // Fallback keyword-based detection
  const mapping = [
    {k: ['sad','depressed','hopeless','alone','cry'], e: 'sadness'},
    {k: ['anxious','anxiety','nervous','worried','panic'], e: 'anxiety'},
    {k: ['stressed','stress','overwhelmed','burnout'], e: 'stress'},
    {k: ['angry','mad','furious','annoyed'], e: 'anger'},
    {k: ['happy','joy','excited','good'], e: 'joy'},
    {k: ['suicide','kill myself','give up','end my life','hopeless'], e: 'crisis'}
  ];

  for (const m of mapping) {
    for (const kw of m.k) {
      if (msg.includes(kw)) return m.e;
    }
  }

  return 'neutral';
}

loadCSV();

module.exports = { predictEmotion, examples };
