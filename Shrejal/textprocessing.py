import pandas as pd
import re
import spacy
data = pd.read_excel("dataset.csv.xlsx")
print("Original Data:")
print(data)
def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text
data["Clean_Description"] = data["Description"].apply(clean_text)
print("\nAfter Lowercase and Punctuation Removal:")
print(data[["Name", "Clean_Description"]])
def tokenize(text):
    return text.split()
data["Tokens"] = data["Clean_Description"].apply(tokenize)
print("\nAfter Tokenization:")
print(data[["Name", "Tokens"]])
stop_words = ["a", "the", "is", "and", "to", "of", "in", "on", "for", "with", "was"]
def remove_stopwords(words):
    result = []
    for word in words:
        if word not in stop_words:
            result.append(word)
    return result
data["Tokens"] = data["Tokens"].apply(remove_stopwords)
print("\nAfter Stop Word Removal:")
print(data[["Name", "Tokens"]])
nlp = spacy.load("en_core_web_sm")
def lemmatize_words(words):
    text = " ".join(words)
    doc = nlp(text)
    result = []
    for word in doc:
        result.append(word.lemma_)
    return result
