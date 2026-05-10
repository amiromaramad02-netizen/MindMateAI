from flask import Flask, request, jsonify
from emotion_model import predict_emotion

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "Text is required"}), 400
    emotion = predict_emotion(text)
    return jsonify({"emotion": emotion})

if __name__ == "__main__":
    app.run(port=5001)