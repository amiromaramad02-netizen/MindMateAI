/**
 * Local Responses Engine
 * Provides immediate, rule-based responses based on detected emotion or greeting.
 */

const FALLBACK_RESPONSES = {
  greeting: [
    "Hello. I'm MindMate. I'm here to listen and support you. How are you feeling today?",
    "Hi. I'm glad you reached out. As your therapist today, what's on your mind?",
    "Hello. I'm here to provide a safe space for you. How can I help you navigate things today?",
    "Hi there. I'm ready whenever you are. What would you like to explore together today?"
  ],
  sadness: [
    "I hear the weight in your words. It's okay to sit with this sadness for a while. What feels most difficult right now?",
    "I'm here with you. Sadness can be a heavy burden to carry alone. Would you like to talk more about what's been happening?",
    "I understand. Acknowledging these feelings is an important first step. What's been weighing on your heart today?",
    "I hear you. I'm sorry things are so tough right now. In this safe space, what else would you like to share?"
  ],
  anxiety: [
    "I hear the tension in what you're saying. Let's try to slow things down together. What's the biggest worry on your mind right now?",
    "I understand how overwhelming anxiety can feel. You're safe here. What do you feel triggered this shift in your energy?",
    "Anxiety often tries to tell us something. If we were to listen to it for a moment, what would it say is the main concern?",
    "I'm here to help you navigate this. Let's focus on one thing at a time. What feels most urgent to talk about?"
  ],
  stress: [
    "I hear that you have a lot on your plate. If we were to look at everything together, what piece feels the heaviest right now?",
    "I understand. Stress can really take a toll on our wellbeing. Have you had any moments for yourself lately?",
    "It sounds like a lot to carry. Let's try to break things down into smaller, more manageable pieces together. Where should we start?",
    "I hear the pressure you're under. You don't have to face this alone. What's been the most draining part of your day?"
  ],
  anger: [
    "I hear your frustration, and it's completely valid. What do you feel is at the root of this anger right now?",
    "I understand. Anger is often a messenger. What is it trying to tell us about what you need right now?",
    "I'm listening. It's okay to feel this way. Would it help to walk me through what triggered this?",
    "I hear the intensity of your feelings. Let's explore what happened today that brought this up for you."
  ],
  joy: [
    "I'm so glad to hear that. It's important to honor these moments of light. What's brought this shift for you?",
    "That's wonderful. I can feel the shift in your energy. Tell me more about what's going well.",
    "I love hearing that. Celebrating the wins, no matter how small, is a big part of this journey. What feels best about it?",
    "I'm genuinely happy for you. How does it feel to share this positive news today?"
  ],
  crisis: [
    "I'm really concerned about what you've shared. Please reach out to a crisis helpline immediately: 988 (Suicide & Crisis Lifeline). You matter, and help is available right now.",
    "What you're feeling is very serious, and I want to make sure you're safe. Please talk to someone who can help — call 988 or text HOME to 741741. You are not alone."
  ],
  neutral: [
    "I'm listening. How does it feel to talk about this today?",
    "I understand. I'm here to support you in whatever way you need. What else is on your mind?",
    "I appreciate you opening up. As we explore this, what thoughts are coming up for you?",
    "I'm following you. What are your thoughts on that right now?",
    "I'm here to listen. Can you tell me more about how you're feeling about this?"
  ]
};

function getLocalResponse(emotion) {
  const options = FALLBACK_RESPONSES[emotion] || FALLBACK_RESPONSES.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

module.exports = { getLocalResponse };
