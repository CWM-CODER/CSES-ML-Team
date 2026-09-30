import pandas as pd
import re
data = pd.read_csv("dataset.csv")
print(data)
def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text
data["Clean_Description"] = data["Description"].apply(clean_text)
print(data[["Description", "Clean_Description"]])