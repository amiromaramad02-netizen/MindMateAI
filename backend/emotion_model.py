import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load the model and tokenizer
model_path = "models/emotion_model.pt"  # Update with your model path
model = torch.load(model_path)
model.eval()

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")  # Update if using a different tokenizer

def predict_emotion(text):
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class = torch.argmax(logits, dim=1).item()
    return predicted_class

if __name__ == "__main__":
    # Test the model
    text = "I feel so happy today!"
    emotion = predict_emotion(text)
    print(f"Predicted emotion: {emotion}")