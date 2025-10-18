"""
Quick test script to check if Gemini API key is working
"""
import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

def test_gemini_api():
    print("Testing Gemini API...")
    
    # Check if API key exists
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("No GOOGLE_API_KEY found in environment variables")
        return False
    
    print(f"API Key found: {api_key[:10]}...{api_key[-10:]}")
    
    try:
        # Set the API key in environment (some versions need this)
        os.environ['GOOGLE_API_KEY'] = api_key
        
        # Initialize client
        client = genai.Client()
        print("Gemini client initialized successfully")
        
        # Test with a simple request
        print("Testing API call...")
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents="Hello! Just respond with 'API is working!' to confirm connectivity.",
        )
        
        print(f"API Response: {response.text}")
        return True
        
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        
        # Try alternative model names
        alternative_models = [
            "gemini-2.5-flash",
            "gemini-1.5-flash", 
            "gemini-pro",
        ]
        
        for model in alternative_models:
            try:
                print(f"Trying alternative model: {model}")
                response = client.models.generate_content(
                    model=model,
                    contents="Hello! Just respond with 'API is working!' to confirm connectivity.",
                )
                print(f"Success with {model}: {response.text}")
                return True
            except Exception as model_error:
                print(f"{model} failed: {str(model_error)}")
        
        return False

if __name__ == "__main__":
    success = test_gemini_api()
    if success:
        print("\nGemini API is working correctly!")
    else:
        print("\nGemini API test failed - check your API key and model configuration")