import pandas as pd
import os

# 1. Point to your local file inside your project folder
# This assumes your folder is called 'data' and the file is 'AI_Risk_Questions.csv'
file_path = os.path.expanduser("~/Downloads/ONBOARDING_QUE.xlsx")

# 2. Load all 50+ questions instantly into a DataFrame
df = pd.read_excel(file_path)

# 3. Now you can use it! 
# For example, to see the first 5 questions in your terminal:
print(df.head())

# To get the weight of a specific question:
weight = df[df['Question_ID'] == 'AI-001']['Weight'].values[0]
print(weight)


