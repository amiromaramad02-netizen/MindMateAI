import sys
import json
import numpy as np
import os

# Suppress TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    try:
        import tensorflow.lite as tflite
    except ImportError:
        print(json.dumps({"error": "TFLite/TensorFlow not installed"}))
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Model path required"}))
        sys.exit(1)
        
    model_path = sys.argv[1]
    
    try:
        # Some versions of TF on Mac need this
        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
    except Exception as e:
        error_msg = str(e)
        if "opcode 'FULLY_CONNECTED' version '12'" in error_msg:
            error_msg = "Model incompatibility: The TFLite model requires a newer version of TensorFlow than what is installed (Opcode v12 mismatch)."
        print(json.dumps({"error": error_msg}))
        sys.exit(1)

    # Signal ready
    print("READY", flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            data = json.loads(line)
            sequence = data.get("sequence")
            
            if not sequence:
                print(json.dumps({"error": "No sequence provided"}))
                continue
                
            # Prepare input tensor
            input_shape = input_details[0]['shape']
            input_dtype = input_details[0]['dtype']
            
            # Convert to numpy array matching model requirements
            input_data = np.array([sequence], dtype=input_dtype)
            
            # Predict
            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()
            output_data = interpreter.get_tensor(output_details[0]['index'])
            
            # Output probabilities
            logits = output_data[0].tolist()
            
            print(json.dumps({"logits": logits}), flush=True)
            
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
