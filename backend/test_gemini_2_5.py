"""
Test Gemini 2.5 Flash model specifically
"""
import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

def test_gemini_2_5_flash():
    print("🔍 Testing Gemini 2.5 Flash model...")
    
    try:
        # Initialize client
        client = genai.Client()
        print("✅ Gemini client initialized")
        
        # Test with gemini-2.5-flash model
        print("🧪 Testing gemini-2.5-flash model...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Just respond with 'Gemini 2.5 Flash is working!' to confirm.",
        )
        
        print(f"✅ Gemini 2.5 Flash Response: {response.text}")
        return True
        
    except Exception as e:
        print(f"❌ Error with gemini-2.5-flash: {e}")
        
        # Try alternative model
        try:
            print("🔄 Trying gemini-2.0-flash-exp instead...")
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents="Just respond with 'Alternative model working!' to confirm.",
            )
            print(f"✅ Alternative model Response: {response.text}")
            return "gemini-2.0-flash-exp"
            
        except Exception as e2:
            print(f"❌ Error with alternative model: {e2}")
            return False

if __name__ == "__main__":
    result = test_gemini_2_5_flash()
    if result == True:
        print("🎉 gemini-2.5-flash is working!")
    elif result == "gemini-2.0-flash-exp":
        print("🎉 gemini-2.0-flash-exp is working as alternative!")
    else:
        print("❌ Both models failed")