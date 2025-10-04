#guys dekho ye steps follow karo 

1.cd backend
2.python -m venv myenv write this 
3.myenv\Scripts\activate(ye step mein shayyad se ek popup ayega toh okay bhi kar sakte ho toh kuch karne ka jarurat nahi padega)
4.your terminal will look like this after running this 
5.pip install fastapi uvicorn yfinance pandas python-multipart pydantic

6.(myenv) PS C:\Users\VALENTINO GOMES\OneDrive\Desktop\ai_finance> cd backend
  (myenv) PS C:\Users\VALENTINO GOMES\OneDrive\Desktop\ai_finance\backend> python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000



OUTPUT:
INFO:     Will watch for changes in these directories: ['C:\\Users\\VALENTINO GOMES\\OneDrive\\Desktop\\ai_finance\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [16896] using StatReload
INFO:     Started server process [24508]
INFO:     Waiting for application startup.
INFO:     Application startup complete.

